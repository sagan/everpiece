var config = require("../config");
var mongoose = require('mongoose')
var db = mongoose.createConnection(config.db_host, config.db_name, config.db_port, {
	user: config.db_user,
	pass: config.db_pass,
});

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
	console.log("open");

	var kittySchema = new mongoose.Schema({
		name: String
	});
	

	kittySchema.methods.speak = function () {
		var greeting = this.name
			? "Meow name is " + this.name
			: "I don't have a name"
		console.log(greeting);
	};

	var Kitten = db.model('Kitten', kittySchema);

	var fluffy = new Kitten({ name: 'fluffy' });
	fluffy.speak(); // "Meow name is fluffy"

	fluffy.save(function (err) {
		if (err) // TODO handle the error
 			console.log('meow');
	});

});


var escape_regexp = function(str) {
    return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};