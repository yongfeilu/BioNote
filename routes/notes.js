var express = require("express");
var router  = express.Router();
var Note 	= require("../models/note");
var User	= require("../models/user");
var Question= require("../models/question");
var Review = require("../models/review");
var Notification = require("../models/notification");
var middleware = require("../middleware");
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
	var noMatch;
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), "gi");
		Note.find({name: regex}, function(err, allNotes){
			if(err){
				console.log(err);
			} else {
				if(allNotes.length < 1){
					var noMatch = "No Notes match that query, please try again.";
				}
				res.render("notes/index", {notes: allNotes, noMatch: noMatch});
			}
		})
	} else{
	
		Note.find({}, function(err, allNotes){
			if(err){
				console.log(err);
			} else {
				res.render("notes/index", {notes: allNotes, currentUser: req.user, noMatch: noMatch});
			}
		});
	}
});

router.post("/", middleware.isLoggedIn, upload.single('image'), async function(req, res) {
	cloudinary.uploader.upload(req.file.path, async function(result) {
  // add cloudi nary url for the image to the campground object under image property
  	req.body.note.image = result.secure_url;
  // add author to campground
	req.body.note.imageId = result.public_id;
  	req.body.note.author = {
		id: req.user._id,
		username: req.user.username
	  }
	var name = req.body.note.name;
	var difficulty = req.body.note.difficulty;
	var image = req.body.note.image;
	var imageId = req.body.note.imageId;
    var desc = req.body.note.description;
	var url = req.body.note.url;
	var author = {
        id: req.user._id,
        username: req.user.username
    };
	var questions = req.body.questions;
	var newNote = {name: name, difficulty: difficulty, image: image, imageId: imageId, description: desc, url: url, author: author, questions: questions};
	try {
      let note = await Note.create(newNote);
      let user = await User.findById(req.user._id).populate('followers').exec();
      let newNotification = {
        username: req.user.username,
        noteId: note.id
      }
      for(const follower of user.followers) {
        let notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        follower.save();
      }

      //redirect back to campgrounds page
      res.redirect(`/notes/${note.id}`);
    } catch(err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
	
	});
});


router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("notes/new");
});

router.get("/:id", function(req, res){
	Note.findById(req.params.id).populate("questions").populate({
		path: "reviews",
		options: {sort: {createdAt: -1}}
	}).exec(function(err, foundNote){
		if(err || !foundNote){ 
			req.flash("error", "Note not found!");
			res.redirect("back");
		} else {
			res.render("notes/show", {note: foundNote});
		}
	});
});

//EDIT NOTE ROUTE
router.get("/:id/edit", middleware.checkNoteOwnership, function(req, res){
	Note.findById(req.params.id, function(err, foundNote){
		res.render("notes/edit", {note: foundNote});
	});
}); 

// UPDATE NOTE ROUTE
router.put("/:id", middleware.checkNoteOwnership, upload.single('image'), function(req, res){
	delete req.body.note.rating;
	Note.findByIdAndUpdate(req.params.id, req.body.note,  async function(err, note){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if (req.file) {
				try {
                  await cloudinary.uploader.destroy(note.imageId);
                  var result = await cloudinary.uploader.upload(req.file.path);
				  
                  note.imageId = result.public_id;
				  note.image = result.secure_url;
				  
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
			}
			note.name = req.body.note.name;
            note.description = req.body.note.description;
			note.difficulty = req.body.note.difficulty;
			note.url = req.body.note.url;
			note.author = {
				id: req.user._id,
          		username: req.user.username
			}
            note.save();
            req.flash("success","Successfully Updated!");
			res.redirect("/notes/" + req.params.id);
		}
	});
});


router.delete("/:id", middleware.checkNoteOwnership, function(req, res){
	Note.findById(req.params.id, function(err, note){
		if(err){
			res.redirect("/notes");
		} else {
			Question.remove({"_id": {$in: note.questions}}, function(err) {
				if (err) {
					console.log(err);
					return res.redirect("/notes");
				}
				Review.remove({"_id": {$in: note.reviews}}, function(err) {
					if (err) {
						console.log(err);
						return res.redirect("/notes");
					}
					note.remove();
					req.flash("success", "Note deleted successfully!");
                    res.redirect("/notes");
				});
			});
		}
	});
});

function escapeRegex(text) {
	return text.replace(/[-\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;


