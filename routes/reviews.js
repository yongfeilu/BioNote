var express = require("express");
var router 	= express.Router({mergeParams: true});
var Note 	= require("../models/note");
var Review	= require("../models/review");
var middleware = require("../middleware");

//app.use("/notes/:id/reviews", reviewRoutes);

// Reviews Index
router.get("/", function(req, res) {
	Note.findById(req.params.id).populate({
		path: "reviews",
		options: {sort: {createdAt: -1}}
	}).exec(function(err, note) {
		if (err || !note) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/index", {note: note});
	});
});

// Reviews New
router.get("/new", middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res) {
	Note.findById(req.params.id, function(err, note) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/new", {note: note});
	});
});

// Reviews Create
router.post("/", middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res) {
	Note.findById(req.params.id).populate("reviews").exec(function(err, note) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Review.create(req.body.review, function(err, review) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			review.author.id = req.user._id;
			review.author.username = req.user.username;
			review.note = note;
			review.save();
			note.reviews.push(review);
			note.rating = calculateAverage(note.reviews);
			note.save();
			req.flash("success", "Your review has been successfully added.");
			res.redirect("/notes/" + note._id);
		});
	});
});

// Reviews Edit
router.get("/:review_id/edit", middleware.checkReviewOwnership, function(req, res) {
	Review.findById(req.params.review_id, function(err, foundReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		
		res.render("reviews/edit", {note_id: req.params.id, review: foundReview});
	});
});


// Reviews Update
router.put("/:review_id", middleware.checkReviewOwnership, function(req, res){
	Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function(err, updatedReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Note.findById(req.params.id).populate("reviews").exec(function(err, note) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			note.rating = calculateAverage(note.reviews);
			note.save();
			req.flash("success", "Your review was successfully edited.");
			res.redirect("/notes/" + note._id);
		});
	});
});

// Reviews Delete
router.delete("/:review_id", middleware.checkReviewOwnership, function (req, res) {
    Review.findByIdAndRemove(req.params.review_id, function (err) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Note.findByIdAndUpdate(req.params.id,  {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function (err, note) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate campground average
            note.rating = calculateAverage(note.reviews);
            //save changes
        	note.save();
            req.flash("success", "Your review was deleted successfully.");
            res.redirect("/notes/" + req.params.id);
        });
    });
});


function calculateAverage(reviews) {
	if (reviews.length === 0) {
		return 0;
	}
	var sum = 0;
	reviews.forEach(function(element) {
		sum += element.rating;
	});
	return sum / reviews.length;
}

module.exports = router;