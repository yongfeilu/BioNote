var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
// var bcrypt = require("bcrypt-nodejs");

var UserSchema = new mongoose.Schema({
	username:String,
	password:String,
	image: String,
	imageId: String,
	description: String,
	firstName: String,
	lastName: String,
	email: {type: String, unique: true, required: true},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false},
	notifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Notification"
		}
	],
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	],
	todos: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Todo"
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);

