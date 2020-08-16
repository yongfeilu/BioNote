var express    = require("express"),
    app        = express(),
    bodyParser = require("body-parser"),
    mongoose   = require('mongoose'),
	flash	   = require("connect-flash"),
	passport    = require("passport"),
    LocalStrategy = require("passport-local"),
	methodOverride = require("method-override"),
    Campground  = require("./models/note"),
    Question     = require("./models/question"),
    User        = require("./models/user"),
	Note       = require("./models/note"),
	Todo	   = require("./models/todo"),
	seedDB     = require("./seeds")

// requiring routes
var questionRoutes  = require("./routes/questions"),
	todoRoutes		= require("./routes/todos"),
	reviewRoutes    = require("./routes/reviews"),
	noteRoutes		= require("./routes/notes"),
	indexRoutes		= require("./routes/index")
	


mongoose.connect('mongodb://localhost:27017/notesdb_final', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));


app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"))
app.use(methodOverride("_method"));
app.use(flash());
// seedDB();

app.locals.moment = require('moment');
// PASSPORT CONF IGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(async function(req, res, next){
	res.locals.currentUser = req.user;
	if(req.user) {
		try {
			let user = await User.findById(req.user._id).populate("notifications", null, { isRead: false }).exec();
			res.locals.notifications = user.notifications.reverse();
		} catch(err) {
			console.log(err.message);
		}
	}
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
})

app.use("/", indexRoutes);
app.use("/todos", todoRoutes);
app.use("/notes", noteRoutes);
app.use("/notes/:id/questions", questionRoutes);
app.use("/notes/:id/reviews", reviewRoutes);



app.listen(3000, function(){
	console.log("The Server Has Started...");
});