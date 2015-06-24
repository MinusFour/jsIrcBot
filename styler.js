var styler = { };

var colorList = {
	white : 0,
	black : 1,
	navy : 2,
	green : 3,
	red : 4,
	brown : 5,
	purple : 6,
	orange : 7,
	yellow : 8,
	lime : 9,
	teal : 10,
	aqua : 11,
	royal : 12,
	pink : 13,
	grey : 14,
	silver : 15
}

styler.color = function(text, foreground, background){
	var controlCode = '\u0003';
	var colors = background !== undefined ? colorList[foreground] + ',' + colorList[background] : colorList[foreground];
	return wrapControlCode(colors + text, controlCode);
}

function wrapControlCode(text, controlCode){
	return controlCode + text + controlCode;
}

styler.format = function(text, format){
	var controlCode;
	switch(format){
		case 'italics':
			controlCode = '\u001D';
		break;

		case 'bold':
			controlCode = '\u0002';
		break;

		case 'underline':
			controlCode = '\u001F';
		break;

		default:
			controlCode = '';
	}
	return wrapControlCode(text, controlCode);
}

module.exports = styler;
