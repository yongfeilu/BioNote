var express = require("express");
var router  = express.Router();
var passport= require("passport");
var User 	= require("../models/user");
var Note 	= require("../models/note");
var async 	= require("async");
var nodemailer = require("nodemailer");
var crypto	= require("crypto");
var Notification = require("../models/notification");
var middleware = require("../middleware");
var { isLoggedIn } = require("../middleware");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dueazswv7', 
  api_key: "#", 
  api_secret: "#"
});



router.get("/", function(req, res){
	res.render("landing");
});


// show register form
router.get("/register", function(req, res){
   res.render("register", {page: 'register'}); 
});

//handle sign up logic
router.post("/register", upload.single("image") , async function(req, res){
	cloudinary.uploader.upload(req.file.path, async function(result) {
		req.body.image = result.secure_url;
		req.body.imageId  = result.public_id;
		var newUser = new User({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			adminCode: req.body.adminCode,
			username: req.body.username,
			description: req.body.description,
			image: result.secure_url,
			imageId: result.public_id
		});
		if (req.body.adminCode === "ecretcode1234") {
			newUser.isAdmin = true;
		}
		User.register(newUser, req.body.password, function(err, user){
			if(err){
				req.flash("error", err.message);
				return res.render("register", {error: err.message});
			}
			passport.authenticate("local")(req, res, function(){
				   req.flash("success", "Welcome to BioNote, " + user.username);
				   res.redirect("/notes"); 
			});
		});
		
	});
});


// show login form
router.get("/login", function(req, res){
   res.render("login", {page: 'login'}); 
});
// handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/notes",
        failureRedirect: "/login",
		failureFlash: true,
		successFlash: "Welcome to BioNote!"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/notes");
});

//User Profile
router.get("/users/:id", isLoggedIn, async function(req, res){
	try {
		
		let user = await User.findById(req.params.id).populate('followers').exec();
		let notes = await Note.find().where("author.id").equals(user._id).exec();
		res.render("users/show", {user: user, notes: notes});
	} catch(err) {
		req.flash("error", "Something went wrong.");
		return res.redirect("back");
	}
});

// Get Edit User Profile
router.get("/users/:user_id/edit", middleware.checkUserOwnership, function(req, res) {
	User.findById(req.params.user_id, function(err, newUser) {
		if (err) {
			req.flash("error", err.message);
			res.redirect("back");
		}
		res.render("users/edit", {user: newUser});
	});
});

// User Profile Edit Put
router.put("/users/:user_id", upload.single("image"), function(req, res) {
	User.findByIdAndUpdate(req.params.user_id, req.body, async function(err, user) {
		if(err) {
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.file) {
				try {
					await cloudinary.uploader.destroy(user.imageId);
					var result = await cloudinary.uploader.upload(req.file.path);
					user.imageId = result.public_id;
					user.image = result.secure_url;
				} catch(err) {
					req.flash("error", err.message);
					return res.redirect("back");
				}
			}
			user.username = req.body.username;
			user.firstName = req.body.firstName;
			user.lastName = req.body.lastName;
			user.email = req.body.email;
			user.description = req.body.description;
			user.adminCode = req.body.adminCode;
			user.save();
			req.flash("success", "Successfully Updated Your Profile!");
			res.redirect("/users/" + user._id);
		}
	});
});


// follow user
router.get("/follow/:id", isLoggedIn, async function(req, res) {
	try {
		let user = await User.findById(req.params.id);
		user.followers.push(req.user._id);
		user.save();
		req.flash('success', 'Successfully followed ' + user.username + '!');
		res.redirect('/users/' + req.params.id);
	} catch(err) {
		req.flash("error", err.message);
		res.redirect("back");
	}
});

router.get("/notifications", isLoggedIn, async function(req, res) {
	try {
		let user = await User.findById(req.user._id).populate({
			path: "notifications",
			options: { sort: {"_id": -1} }
		}).exec();
		let allNotifications = user.notifications;
		res.render("notifications/index", {allNotifications });
	} catch(err) {
		req.flash("error", err.message);
		res.redirect("back");
	}
});

// handle notifications
router.get("/notifications/:id", isLoggedIn, async function(req, res) {
	try  {
		let notification = await Notification.findById(req.params.id);
		notification.isRead = true;
		notification.save();
		res.redirect("/notes/" + notification.noteId);
	} catch(err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

// forgot password
router.get("/forgot", function(req, res){
	res.render("forgot");
});


router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'yflecon@gmail.com',
          pass: "#"
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'yflecon@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});


router.get("/reset/:token", function(req, res){
	User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user) {
		if(!user) {
			req.flash("error", "Password reset token is invalid or has expired.");
			return res.redirect("/forgot");
		}
		res.render("reset", {token: req.params.token});
	});
});


router.post("/reset/:token", function(req, res) {
	async.waterfall([
		function(done) {
			User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires:{$gt: Date.now()}}, function(err, user) {
				if(!user) {
					req.flash("error", "Password reset token is invalid or has expired.");
					return res.redirect("back");
				}
				if(req.body.password  === req.body.confirm) {
					user.setPassword(req.body.password, function(err) {
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;
						
						user.save(function(err) {
							req.logIn(user, function(err) {
								done(err, user);
							});
						});
					});
				} else {
					req.flash("error", "Passwords do not match.");
					return res.redirect("back");
				}
			});
		},
		function(user, done) {
			var smtpTransport = nodemailer.createTransport({
				service: "Gmail",
				auth: {
					user: "yflecon@gmail.com",
					pass: process.env.GMAILPW
				}
			});
			var mailOptions = {
				to: user.email,
				from: "yflecon@gmail.com",
				subject: "Your password has been changed",
				text: "Hello,\n\n" +
          "This is a confirmation that the password for your account "  + user.email + " has just been changed.\n"
			};
			smtpTransport.sendMail(mailOptions, function(err) {
				req.flash("success", "Success! Your password has been changed.");
				done(err);
			});
		}
	], function(err) {
		res.redirect("/notes");
	});
});

module.exports = router;