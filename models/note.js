
var mongoose = require("mongoose");
var Question = require("./question");
var Review	 = require("./review");

var noteSchema = new mongoose.Schema({
	name: String,
	difficulty: String,
	image : String,
	imageId:String,
	description: String,
	url: String,
	createAt: {type: Date, default: Date.now},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	questions: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Question"
		}
	],
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Review"
		}
	],
	rating: {
		type: Number,
		default: 0
	}
});

module.exports = mongoose.model("Note", noteSchema);