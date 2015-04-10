(function() {
	var otherScripts = [
		"utils.js",
		"engine.js",
		"game.js"
	];
	var newScript;
	otherScripts.forEach(function(ele) {
		newScript = document.createElement("script");
		newScript.src = ele;
		document.getElementsByTagName("head")[0].appendChild(newScript);
	});
})();