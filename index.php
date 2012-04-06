<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title></title>
		<style>
			input {
				width: 300px;
				margin: 10px;
				display: block;
			}
			.error {
				box-shadow: none;
				border: 2px solid #f00;
		}
		</style>
    </head>
    <body>
		<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js"></script>
		<script type="text/javascript" src="xdate.js"></script>
		<script type="text/javascript" src="jQuery.beautiform.js"></script>
		<script type="text/javascript">
			jQuery(function () {
				$('form').submit(function () {
					return false;
				});
			$('form').beautiform();
				return;
				// Code for validation
				$('input, textarea, select').bind('invalid', function () {
					var m;
					switch (true) {
						case this.validity.customError:
							m = this.validity.validationMessage;
							break;
						case this.validity.stepMismatch:
							m = 'This field\'s value must be a multiple of '+this.attr('step')+'!';
							break;
						case this.validity.patternMismatch:
							m = 'This field\'s value must validate against /'+this.attr('pattern')+'/';
							break;
						case this.validity.rangeOverflow:
							m = 'This field\'s value must be equal to or less than '+this.attr('max')+'!';
							break;
						case this.validity.rangeUnderflow:
							m = 'This field\'s value must be equal to or greater than '+this.attr('min')+'!';
							break;
						case this.validity.tooLong:
							var maxlength = parseInt(this.attr('maxlength'));
							m = 'This field\'s value must be shorter than '+maxlength+' character'+(maxlength, maxlength > 1 ? 's' : '');
							break;
						case this.validity.typeMismatch:
							m = 'This field\'s value does not match the inputs type.';
							break;
						case this.validity.valueMissing:
							m = 'This field is required.';
							break;
					}

					$(this).addClass('error');
				}); // */
			});
		</script>
		<form action="#" method="post">
			<input type="number" name="number" value="10" />
			<input type="number" name="number" value="10" step="5" />
			<input type="number" name="number" value="10" step="2.5" />
			<input type="number" name="range" min="0" max="100" value="10" step="2.5" />
			<input type="submit" />
		</form>
    </body>
</html>
