(function ($) {
	
	var methods = {
		init: function () {
			this.beautiform('widgets.stepper');
		},
		/**
		 * Steppers are number and range fields
		 */
		stepper: function () {
			this.find('input[type=number], input[type=range]').bind('keydown keypress', function (evt) {
				// Get the step, defaults to any
				var step = parseFloat($(this).attr('step'));
				if (!step)
					return;

				var val = parseFloat($(this).val());
				var origval = val;

				if (evt.keyCode == 38) {
					val += step;
				} else if (evt.keyCode == 40) {
					val -= step;
				}

				$(this).val(val);

				// Now validate the change if possible
				$(this).beautiform('validator.validate');
				if ($(this).beautiform('validator.validity').rangeOverflow)
					val -= step;
				else if ($(this).beautiform('validator.validity').rangeUnderflow)
					val += step;

				$(this).val(val);
			});
		}
	}
	
	$.fn.beautiform.widgets = function ( method ) {
		this.methods = methods;
		return this.loader.apply(this, arguments);
	}
	
})(jQuery);