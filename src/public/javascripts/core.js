// version beta


String.prototype.format = function() {
    var args = arguments;

    return this.replace(/\{(\d+)\}/g, function() {
        return args[arguments[1]];
    });
};

// Returns '2 + -1 = 1'.
'{0} + {1} = {2}'.format(2, -1, 1);

function __(key) {
	if( msgs[key] ) {
		return String.prototype.format.apply(msgs[key], arguments);
	} else {
		return key;
	}
}

$(function() {
	$.get("/status", function(data) {
		if( data.username ) {
			$("#user").html(data.username);
			$("#user").attr("href", "/logout");
		} else {
			$("#user").html(__("login"));
			$("#user").attr("href", "/auth");
		}
	});
});
