var express = require("express");
var router  = express.Router({mergeParams: true});
var User = require("../models/user");
var Todo = require("../models/todo");
var middleware = require("../middleware");
//app.use("/todos", todoRoutes);

// GET
router.get("/", middleware.isLoggedIn, function(req, res) {
	User.findById(req.user._id).populate("todos").exec(function(err, user){
		if(err) {
			req.flash("error", err.message);
			return res.redirect("back");
		} else {
			res.render("todos/show", {user: user});
		}
	});
	
	
})
// Create
router.post('/', middleware.isLoggedIn,  async (req, res) => {
	const todo = new Todo({
		content: req.body.content
	});
	
	try {
		let user = await User.findById(req.user._id);
		user.todos.push(todo);
		await todo.save();
		await user.save();
		res.redirect("back");
	} catch(err) {
		req.flash("error", err.message);
		res.redirect("back");
	}
});

//UPDATE
router.get("/edit/:id", function(req, res) {
	const id = req.params.id;
	User.findById(req.user._id).populate("todos").exec(function(err, user){
		if(err) {
			req.flash("error", err.message);
			return res.redirect("back");
		} else {
			
			res.render("todos/edit", {user: user, idTask: id });
		}
	});
});



// update post
router.post("/edit/:id", (req, res) => {
	const id = req.params.id;
	Todo.findByIdAndUpdate(id, { content: req.body.content }, err => {
		if (err) return res.send(500, err);
		res.redirect("/todos");
	});
});

// DELETE
router.route("/remove/:id").get((req, res) => {
	const id = req.params.id;
	Todo.findByIdAndRemove(id, err => {
		if (err) return res.send(500, err);
		res.redirect("/todos");
	});
});

module.exports = router;