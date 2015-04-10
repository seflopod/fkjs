var utils = {
	strip : function(n) {
		return parseFloat(n.toPrecision(6));
	},
	
	fastRound: function(n) {
		return (n + 0.5) << 0;
	},

	clamp: function(n, min, max) {
		if(n < min) {
			return min;
		}

		if(n > max) {
			return max;
		}

		return n;
	}
};