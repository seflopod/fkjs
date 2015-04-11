(function() {
	var otherScripts = [
		"utils.js",
		"engine.js",
		"game.js"
	].forEach(function(ele) {
		var newScript = document.createElement("script");
		newScript.src = ele;
		newScript.async = false;
		//document.getElementsByTagName("head")[0].appendChild(newScript);
		document.head.appendChild(newScript);
	});
})();