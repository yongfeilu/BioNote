// all the middleware goes here
var Note = require("../models/note");
var Question = require("../models/question");
var Review = require("../models/review");
var User = require("../models/user");
var middlewareObj = {};

middlewareObj.checkNoteOwnership = function(req, res, next) {
	 if(req.isAuthenticated()){
			Note.findById(req.params.id, function(err, foundNote){
			   if(err || !foundNote){
				   req.flash("error", "Note not found");
				   res.redirect("back");
			   }  else {
				   // does user own the campground?
				if(foundNote.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			   }
			});
		} else {
			req.flash("error", "You need to be logged in to do that");
			res.redirect("back");
		}
	} 




middlewareObj.checkCommentOwnership = function(req, res, next) {
	if(req.isAuthenticated()){
		Question.findById(req.params.question_id, function(err, foundQuestion){
			   if(err || !foundQuestion){
				   req.flash("error", "Question not found!");
				   res.redirect("back");
			   }  else {
				   // does user own the campground?
				if(req.user._id.equals(foundQuestion.author.id) || req.user.isAdmin) {
					next();
				} else {
					req.flash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			   }
			});
		} else {
			req.flash("error", "You need to be logged in to do that");
			res.redirect("back");
		}
	} 

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
	req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};

middlewareObj.checkReviewOwnership = function(req, res, next) {
	if (req.isAuthenticated()) {
		Review.findById(req.params.review_id, function(err, foundReview){
			if(err || !foundReview){
				req.flash("error", "Somthing went wrong!");
				res.redirect("back");
			} else {
				if(foundReview.author.id.equals(req.user._id)) {
					next();
				} else {
					req.reflash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
	}
};

middlewareObj.checkReviewExistence = function(req, res, next) {
	if (req.isAuthenticated()) {
		Note.findById(req.params.id).populate("reviews").exec(function(err, foundNote) {
			if (err || !foundNote) {
				req.flash("error", "Note not found.");
				req.redirect("back");
			} else {
				var foundUserReview = foundNote.reviews.some(function(review) {
					return review.author.id.equals(req.user._id);
				});
				if (foundUserReview) {
					req.flash("error", "You already wrote a review.");
					return res.redirect("/notes/" + foundNote._id);
				}
				next();
			}
		});
	} else {
		req.flash("error", "You need to login first.");
		res.redirect("back");
	}
}

middlewareObj.checkUserOwnership = function(req, res, next) {
	if (req.isAuthenticated()) {
		User.findById(req.params.user_id, function(err, foundUser) {
			if (err || !foundUser) {
				req.flash("error", "Somthing went wrong!");
				res.redirect("back");
			} else {
				if (foundUser._id.equals(req.user._id)) {
					next();
				} else {
					req.flash("error", "You don't have permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
	}
}

module.exports = middlewareObj;
