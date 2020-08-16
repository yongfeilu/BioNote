var mongoose = require("mongoose");

var questionSchema = mongoose.Schema({
	title: String,
	text: String,
	image: String,
	imageId: String,
	createdAt: { type: Date, default: Date.now },
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	}
});



module.exports = mongoose.model("Question", questionSchema);