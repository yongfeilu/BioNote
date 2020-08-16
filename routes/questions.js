var express = require("express");
var router  = express.Router({mergeParams: true});
var Note 	= require("../models/note");
var Question = require("../models/question");
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
// app.use("/notes/:id/questions", questionRoutes);

// Question New
router.get("/new", middleware.isLoggedIn, function(req, res){
    // find campground by id
    Note.findById(req.params.id, function(err, note){
        if(err){
            console.log(err);
        } else {
             res.render("questions/new", {note: note});
        }
    })
});

//Questions Create
router.post("/", middleware.isLoggedIn, upload.single("image"), async function(req, res) {
	cloudinary.uploader.upload(req.file.path, async function(result) {
		req.body.question.image = result.secure_url;
		req.body.question.imageId = result.public_id;
		req.body.question.author = {
			id: req.user._id,
			username: req.user.username
		}
		var title = req.body.question.title;
		var text = req.body.question.text;
		var image = req.body.question.image;
		var imageId = req.body.question.imageId;
		var newQuestion = {title: title, text: text, image: image, imageId: imageId};
		Note.findById(req.params.id, function(err, note) {
			if(err) {
				req.flash("error", err.message);
				res.redirect("back");
			}
			Question.create(newQuestion, function(err, question) {
				if (err) {
					req.flash("error", err.message);
					res.redirect("back");
				} else {
			  		question.author.id = req.user._id;
			  	 	question.author.username = req.user.username;
					question.save();
					note.questions.push(question);
					note.save();
					req.flash("success", "Successfully added question！");
                    res.redirect('/notes/' + note._id);
				}
				
			})
		})
	});
});



//Question SHOW ROUTE
router.get("/:question_id", function(req, res) {
	Note.findById(req.params.id, function(err, foundNote){
		if (err || !foundNote) {
			req.flash("error", "No note found!");
			return res.redirect("back");
		}
		Question.findById(req.params.question_id, function(err, foundQuestion){
			if (err || !foundQuestion) {
				req.flash("error", "Question not found!");
				res.redirect("back");
			} else {
				res.render("questions/show", {note: foundNote, question: foundQuestion});
			}
		});
	});
});

// COMMENT EDIT ROUTE
router.get("/:question_id/edit", middleware.checkCommentOwnership, function(req, res){
	Note.findById(req.params.id, function(err, foundNote){
		if(err || !foundNote) {
			req.flash("error", "No note found!");
			return res.redirect("back");
		}
		Question.findById(req.params.question_id, function(err, foundQuestion){
			if(err || !foundQuestion){
				req.flash("error", "Question not found!");
				res.redirect("back");
			} else {
				res.render("questions/edit", {note_id: req.params.id, question: foundQuestion});
			}
		});
	});
});

//COMMENT UPDATE
router.put("/:question_id", middleware.checkCommentOwnership, upload.single("image"), function(req, res) {
	Question.findByIdAndUpdate(req.params.question_id, req.body.question, async function(err, question) {
		if (err) {
			req.flash("error", err.message);
			res.redirect("back");
			} else {
				if (req.file) {
					try {
						await cloudinary.uploader.destroy(question.imageId);
						var result = await cloudinary.uploader.upload(req.file.path);
						question.imageId = result.public_id;
						question.image = result.secure_url;
					} catch(err) {
						req.flash("error", err.message);
                 		return res.redirect("back");
					}
				}
				question.title = req.body.question.title;
				question.text = req.body.question.text;
				question.author = {
					id: req.user._id,
					username: req.user.username
				}
				question.save();
				req.flash("success","Successfully Updated!");
				res.redirect("/notes/" + req.params.id);
			}
	})
})



	

//COMMENT DESTROY ROUTE
router.delete("/:question_id", middleware.checkCommentOwnership, function(req, res) {
	Question.findByIdAndRemove(req.params.question_id, function(err) {
		if (err) {
			req.flash("error", err.message);
            return res.redirect("back");
		}
		Note.findByIdAndUpdate(req.params.id, {$pull: {questions: req.params.question_id}}, {new: true}).populate("questions").exec(function(err, note) {
			if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
			note.save();
			req.flash("success", "The question was deleted successfully.");
            res.redirect("/notes/" + req.params.id);
		})
	})
})



module.exports = router;
