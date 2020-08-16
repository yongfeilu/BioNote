var mongoose = require("mongoose");
var Note     = require("./models/note");
var Question = require("./models/question");

var seeds     = [
	{
		name: "Quick Sort",
		image: "https://i.ytimg.com/vi/COk73cpQbFQ/maxresdefault.jpg",
		description: "Quick sort is a bit abstract!",
		url: "https://www.geeksforgeeks.org/quick-sort/"
	},
	{
		name: "Binary Search",
		image:"https://hackernoon.com/hn-images/1*DOR__3reJYPwGuyytG520g.jpeg",
		description:"Binary search is efficient!",
		url: "https://www.geeksforgeeks.org/binary-search/"
	},
	{
		name:"Greedy Algorithm",
		image:"https://miro.medium.com/max/1152/1*UqPSF5RZu6M1uIZ6JIxOfA.png",
		description:"Greedy algorithm is a foundamental method in computer science!",
		url:"https://www.geeksforgeeks.org/greedy-algorithms/"
	}
	
];


async function seedDB(){
	// Remove all notes
	try {
		await Note.deleteMany({});
		console.log("Notes removed.");
		await Question.deleteMany({});
		console.log("Questions removed.");


		for(const seed of seeds) {
			let note = await Note.create(seed);
			console.log("Note created.");
			let question = await Question.create(
				{	
					title: "Question 0",
					text: "This note is excellent!",
					image: "https://blog-c7ff.kxcdn.com/blog/wp-content/uploads/2019/11/Banner-Blog-1A-1.jpg",
					author : "Homer"
				}
			);
			console.log("Question created.");
			note.questions.push(question);
			note.save();
			console.log("Question added to note.");
		}
	} catch(err) {
		console.log(err);
	}
	
}

module.exports = seedDB;