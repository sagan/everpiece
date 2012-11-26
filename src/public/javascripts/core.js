// version beta

$(function() {

	var Session = {};
	Session.init = function(callback) {
		this.server = document.location.protocol + "//"
			+ document.location.host;
			+ document.location.pathname;
		var self = this;

		$.ajax(this.server + "/status", {
			success: function(data) {
				if( !data.error && data.username ) {
					self.username = data.username;
				}
				callback();
			},
			error: function() {
				callback({
					error: "Ajax request error"
				});
			}
		});
	};
	

	window.Session = Session;
	window.App = new AppView({el: document});

	Session.init(function() {
		window.App.render();
	});

});

