class Cell{
	constructor(x, y, node){
		this._x = x;
		this._y = y;
		this._state = "dead";
		this._node = node || undefined;
	}
	set x(new_x) { this._x = new_x; }
	get x() { return this._x; }
	set y(new_y) { this._y = new_y; }
	get y() { return this._y; }
	set node(node) { this._node = new_node; }
	get node() { return this._node; }
	set state(newState) { this._state = newState; }
	get state() { return this._state; }
	getCoord(){
		return [this._x, this._y];
	}
	isAlive(){
		return (this._state == "alive");
	}
	toString(){
		return "Cell: x=" + this._x + ", y=" + this._y + ", state=" + this._state + ", node=" + this._node;
	}
}

$( document ).ready(function(){
	let cellSize = 15;//размер клетки
	let tableHeight = Math.floor( $(window).height()*0.95/(cellSize+2) ),
		tableWidth = Math.floor( (($(window).width()*0.83333)-40)/(cellSize+2)),
		app = $('.app');
	let isPlaying = false,//индикатор игры
		isPlacing = false,//индикатор режима размещения
		shapes,//массив с фигурами из json файла
		currentFigure,//двумерный массив который представляет фигуру для размещения
		timeoutId,
		timeoutDuration = 150,//длительность кадра
		stepCount = 0,//для статистики
		stepTimeStart,
		stepTimeEnd,
		averageStepDuration = 0,
		maxStepDuration = 0,
		//элементы страницы
		body = $('body'),
		control__start = $('.control__start'),
		control__stop = $('.control__stop'),
		control__random = $('.control__random'),
		control__randomFigures = $('.control__random-figures'),
		control__random_slider = $('.control__random_slider'),
		control__clear = $('.control__clear'),
		control__timeout_slider = $('.control__timeout_slider'),
		control__timeout_ms = $('.control__timeout_ms'),
		shapes__block = $('.shapes__block'),//блок для селекторов с фигурами
		count__stepNumber = $('.count__step-number'),
		count__lastStep = $('.count__last-step'),
		count__averageStep = $('.count__average-step'),
		count__maxStep = $('.count__max-step'),
		count__activeCells = $('.count__active-cells'),
		control__size_button = $('.control__size_button'),
		control__size_input = $('.control__size_input'),
		control__size_rebuild = $('.control__size_rebuild'),
		activeArray = [],//живые клетки на текущий момент
		nextArray = [],//живые клетки следующего фрейма
		fullArray = new Array(tableWidth);

	for ( let i = 0; i < fullArray.length; i++ )//создание двумерного массива
		fullArray[i] = new Array(tableHeight);

//------------------------------ НАЧАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ -------------------------------
	control__timeout_ms.text(timeoutDuration);
	control__size_input.val(cellSize);
	createTable( tableHeight, tableWidth, app, cellSize);
	initCells( fullArray, tableWidth, tableHeight, app)

	//прочитать json файл с фигурами и вызвать рендер
	readTextFile("json/figures.json", function(text){
		var data = JSON.parse(text);
		shapes = data.shapes;
		//console.log(data.shapes);
		renderShapesSelects(shapes);
	});
	//console.log(activeArray);
	//преобразовать фигуры в селекты
	function renderShapesSelects(shapesToRender){
		let blockOfSelects = $("<div>");

		shapesToRender.forEach(function(shapeType){//цикл по типам фигур
			let blockOfOneSelect = $("<div>", {class: "form-group text-left"});
			$("<label>", {for: "shape-" + shapeType.shapeType, text: shapeType.shapeType, class: "shape__label"}).appendTo(blockOfOneSelect);
			let newSelect = $("<select>", {
							"class": 'form-control custom-select shape__select shape-' + shapeType.shapeType,
							"id": "shape-" + shapeType.shapeType,
							"data-type": shapeType.shapeType
							});
			$('<option value="" disabled selected hidden>Выбрать</option>').appendTo(newSelect);//надпись по умолчанию

			shapeType.figures.forEach(function(figure){//цикл по фигурам в типе
				$('<option />', {value: figure.figureName, text: figure.figureName} ).appendTo(newSelect);//добавление фигур
			});

			newSelect.appendTo(blockOfOneSelect);//добавить селект в блок этого селекта
			blockOfOneSelect.appendTo(blockOfSelects);//добавить блок этого селекта в блок всех селектов
		});

		blockOfSelects.appendTo(shapes__block);//добавить блок со всеми селектами на страницу

		// //событие нажатия на название фигуры (вариант для мозилы онли)
		// $('.shape__select option').on('click', function(e){
		// 	let select = $(this).parent();
		// 	let figureName = select.find("option:selected").text();
		// 	let type = select.data('type');

		// 	shapesToRender.forEach(function(shapeType){//пройтись по всем фигурам, найти кликнутую фигуру и названичть ее активной
		// 		if (shapeType.shapeType = type){
		// 			shapeType.figures.forEach(function(figure){
		// 				if (figure.figureName == figureName){
		// 					currentFigure = figure.figure;
		// 				}
		// 			});
		// 		}
		// 	});

		// 	enablePlacing();
		// });//конец события нажатия на название фигуры

		//событие нажатия на название фигуры (ченж а не клик потому что клик только в мозиле работает)
		$('.shape__select').on('change', function(e){
			let select = $(this);
			let figureName = select.children(":selected").text();
			let type = select.data('type');

			shapesToRender.forEach(function(shapeType){//пройтись по всем фигурам, найти кликнутую фигуру и названичть ее активной
				if (shapeType.shapeType = type){
					shapeType.figures.forEach(function(figure){
						if (figure.figureName == figureName){
							currentFigure = figure.figure;
						}
					});
				}
			});

			enablePlacing();
		});//конец события нажатия на название фигуры

	}//конец renderShapesSelects()


//------------------------------------------ РЕЖИМ РАЗМЕЩЕНИЕ -----------------------------------------
	//--------------------------------перемещение курсора над клетками в режиме размещения--------------
	app.on( 'mouseenter', 'td', function(event){
		if ( isPlacing ){
			let td = $(event.target).closest('.cell-block');
			let activeFigureX = td.index();
			let activeFigureY = td.closest('tr').index();
			renderActiveFigure( activeFigureX, activeFigureY );//вызвать перерисовку для новых фигур
		}

	});
	//----------------------------------отрисовка активной фигуры в режиме размещения
	function renderActiveFigure( newX, newY ){
		renderActive(activeArray);//стереть предыдущие изменения, нарисовать чистый activeArray
		let width = currentFigure[0].length;
		let height = currentFigure.length;

		for ( let x = 0; x < width; x++ ){//цикл через массив фигуры
			for ( let y = 0; y < height; y++){
				if ( currentFigure[y][x] == 1 ){//если часть фигуры не пустая
					let xToRender = newX + x;
					let yToRender = newY + y;
					//замыкание границ поля
					if ( xToRender < 0 ) xToRender = tableWidth - 1 - x;
					if ( xToRender > tableWidth - 1 ) xToRender = xToRender - tableWidth;
					if ( yToRender < 0 ) yToRender = tableHeight - 1 - y;
					if ( yToRender > tableHeight - 1 ) yToRender = yToRender - tableHeight;
					if ( !fullArray[xToRender][yToRender].isAlive() ){//если еще не живая
						fullArray[xToRender][yToRender].node.classList.add('cell-block_alive');//сделать живой
					}
				}
			}
		}
	}
	//-----------------------------------переключить режим размещения фигур-----------------------------------
	function enablePlacing(){
		activeArray = getAliveCells(fullArray);//обновить массив активных, чтобы учесть изменения предыдущей фигуры
		body.addClass('is-placing');
		isPlacing = true;
	}
	function disablePlacing(){
		body.removeClass('is-placing');
		$('.shape__select').val('');//сброс селекта после окончания режима размещения
		isPlacing = false;
	}
	//--------------------------сброс режима размещения правым кликом
	body.on('contextmenu', function(event){
		if ( isPlacing ){
			renderActive(activeArray);//отмена размещения фигуры
			disablePlacing();
			return false;
		}
	});
//-----------------------------------------------КНОПКИ--------------------------------------------------
	//кнопка старт
	control__start.on('click', function(event){
		startGame();
	});
	//кнопка стоп
	control__stop.on('click', function(event){
		stopGame();
	});
	//кнопка случайное распределение
	control__random.on('click', function(event){
		let partToFill = (+$('.control__random_number').text())/100;

		for ( let x = 0; x < fullArray.length; x++ ){
			for ( let y = 0; y < fullArray[0].length; y++ ){
				if ( Math.random() <= partToFill ){
					fullArray[x][y].node.classList.add('cell-block_alive');
				}
			}
		}

	});
	//кнопка случайное расположение с фигурами
	control__randomFigures.on('click', function(event){
		let partToFill = (+$('.control__random_number').text())/100;


	});
	//слайдер процента случайного заполнения
	control__random_slider.slider({
		min: 5,
		max: 95,
		step: 1,
		value: 20,
		slide: function(event, ui){
			$('.control__random_number').text(ui.value);
		}
	});
	//кнопка очистить
	control__clear.on('click', function(event){
		$('.cell-block_alive').removeClass('cell-block_alive');
		dropStatistics();
	});
	//переключение кругов по нажатию
	app.on( 'click', 'td', function(event){
		if ( !isPlaying && !isPlacing ) $(this).toggleClass('cell-block_alive');//ручное размещение
		if ( isPlacing ) disablePlacing();//отмена размещения фигуры
	});
	//слайдер таймаута
	control__timeout_slider.slider({
		min: 15,
		max: 1500,
		step: 25,
		value: timeoutDuration,
		slide: function(event, ui){
			control__timeout_ms.text(ui.value);
			timeoutDuration = +ui.value;
		}
	});
	//кнопка изменения размера клетки
	control__size_button.on('click', function(event){
		let currentValue = +control__size_input.val();
		if ( $(this).hasClass('control__size_button_minus') ){
			if ( currentValue > 5 ) control__size_input.val( currentValue - 1 );
		}
		else {
			if ( currentValue < 25 ) control__size_input.val( currentValue + 1 );
		}
		cellSize = +control__size_input.val();
	});
	//кнопка пересоздать
	control__size_rebuild.on('click', function(event){
		$('body').addClass('is-loading');

		$('.game-table').remove();//старое поле удалить
		tableHeight = Math.floor( $(window).height()*0.95/(cellSize+3) );//пересчитать размеры поля
		tableWidth = Math.floor( (($(window).width()*0.83333)-40)/(cellSize+2) );

		fullArray = new Array(tableWidth);//новый размер нужен
		for ( let i = 0; i < fullArray.length; i++ )//создание двумерного массива с новыми размерами
			fullArray[i] = new Array(tableHeight);

		createTable(tableHeight, tableWidth, app, cellSize);
		initCells(fullArray, tableWidth, tableHeight, app, cellSize);

		setTimeout(function(){
			$('body').removeClass('is-loading');
		}, 1000 );
	});

	//---------------------------------------START GAME----------------------------------------
	function startGame(){
		activeArray = getAliveCells(fullArray);//просканировать поле

		if ( activeArray.length < 1 ) return;//игнор при пустом поле
		console.log( 'start game' );

		control__start.prop('disabled', true);
		control__clear.prop('disabled', true);
		control__random.prop('disabled', true);
		$('.shape__select').prop('disabled', true);
		control__size_rebuild.prop('disabled', true);
		control__stop.prop('disabled', false);

		isPlaying = true;
		nextStep();//вызов начала отрисовки и расчетов
	}
	//----------------------------------------STOP GAME-----------------------------------------
	function stopGame(){
		isPlaying = false;
		clearTimeout(timeoutId);

		control__start.prop('disabled', false);
		control__clear.prop('disabled', false);
		control__random.prop('disabled', false);
		$('.shape__select').prop('disabled', false);
		control__size_rebuild.prop('disabled', false);
		control__stop.prop('disabled', true);

		console.log('stopGame() triggered');
	}
	//---------------------------------------NEXT STEP----------------------------------------
	//слудующий кадр
	function nextStep(){
		console.log('nextStep() start');
		stepTimeStart = Date.now();
		let cellsToChange = [];

		//цикл добавляет все потенциальные клетки в массив
		activeArray.forEach(function(activeCell){//цикл по всем живым клеткам

			//проверка очередной клетки
			if ( _.indexOf(cellsToChange, activeCell) < 0 ){
				cellsToChange.push(activeCell);
			}

			//проверка соседних клеток
			let surroundingArray = getSurroundingCells( activeCell, fullArray, tableWidth, tableHeight);
			surroundingArray.forEach(function(nearCell){
				if ( _.indexOf( cellsToChange, nearCell ) < 0 ){
					cellsToChange.push(nearCell);
				} 
			});

		});
		//очистить массив следующего кадра
		nextArray.splice( 0, nextArray.length );
		//цикл по потенциальным клеткам
		cellsToChange.forEach(function( cellToProbablyChange, index, array ){
			if ( checkNodeState(cellToProbablyChange, fullArray) == "alive" ) nextArray.push(cellToProbablyChange);
		});

		//console.log(nextArray);

		//применить изменения к полю
		if ( _.union( activeArray, nextArray ).length != activeArray.length && isPlaying ){//если состояние отличается от предыдущего
			activeArray = renderNew(activeArray, nextArray);//ебучее замыкание если не возвращать массив, а ...
		} else {//если состояния одинаковые то закончить
			console.log('изменений больше нет');
			isPlaying = false;
		}
		console.log("Длина activeArray после renderNew " + activeArray.length);

		if ( activeArray.length > 0 && isPlaying ) {//проверка наличия клеток в конце хода
			stepTimeEnd = Date.now();
			let diffTime = stepTimeEnd - stepTimeStart;
			updateStatistics(diffTime);
			timeoutId = setTimeout(nextStep, (timeoutDuration - diffTime));
		} else stopGame();

	}
//-----------------------------------конец NEXT STEP-------------------------------------------------
//----------------------------------------------------РЕНДЕРЫ---------------------------------------
	//применение изменений
	function renderNew(prevArrayLocal, nextArrayLocal){
		let willAlive = _.difference(nextArrayLocal, prevArrayLocal);
		let willDead = _.difference(prevArrayLocal, nextArrayLocal);

		willAlive.forEach(function(item){
			item.state = "alive";
			item.node.classList.add('cell-block_alive');
		});
		willDead.forEach(function(item){
			item.state = "dead";
			item.node.classList.remove('cell-block_alive');
		});

		prevArrayLocal = nextArrayLocal.splice(0, nextArrayLocal.length);
		return prevArrayLocal;
	}
	//очистить поле и нарисовать клетки из переданного массива
	function renderActive(arrayToRender){

		for ( let x = 0; x < fullArray.length; x++ ){//очистка старых
			for ( let y = 0; y < fullArray[0].length; y++ ){
				fullArray[x][y].state = "dead";
				fullArray[x][y].node.classList.remove('cell-block_alive');
			}
		}
		arrayToRender.forEach(function(item){//отрисовка новых
			item.state = "alive";
			item.node.classList.add('cell-block_alive');
		});

	}

//------------------------------------------СТАТИСТИКА------------------------------------
	//обновление статистики шагов
	function updateStatistics(stepDiffTime){
		stepCount++;
		count__activeCells.text(activeArray.length);
		count__stepNumber.text(stepCount);
		count__lastStep.text(stepDiffTime);
		averageStepDuration = ( (averageStepDuration * (stepCount-1) + stepDiffTime) / stepCount );
		count__averageStep.text(averageStepDuration.toFixed(2));
		if ( stepDiffTime > maxStepDuration ){
			maxStepDuration = stepDiffTime;
			count__maxStep.text(maxStepDuration);
		}
	}
	//сброс статистики шагов
	function dropStatistics(){
		stepCount = 0;
		count__activeCells.text('0');
		count__stepNumber.text(stepCount);
		count__lastStep.text('000');
		averageStepDuration = 0;
		count__averageStep.text('000');
		maxStepDuration = 0;
		count__maxStep.text(maxStepDuration);
	}

});//конец $ doc ready
//----------------------------------------------ФУНКЦИИ------------------------------------------------
//----------------------------------------checkNodeState( item, fullArray )-----------------------------
//проверка на живость клетки
function checkNodeState( item, fullArray ){
	let countAlive = 0;
	let surroundingArray = getSurroundingCells(item, fullArray, fullArray.length, fullArray[0].length);

	//количество живых вокруг
	surroundingArray.forEach(function(item){
		if ( item.isAlive() ) countAlive++;
	});

	if ( item.isAlive() ){//если была живая
		if ( countAlive == 2 || countAlive == 3 ) return 'alive';
		else {
			return 'dead';
		}
	} else if ( countAlive == 3 ){//если была неживая
		return 'alive';
	}
	return 'dead';
}
//----------------------------------------------getSurroundingCells( item, fullArray, width, height)-----------------------
//найти массив нод, окружающих клетку
function getSurroundingCells( item, fullArray, width, height){
	let x, y,//координаты клетки внутри массива fullArray
		surroundingArray = [],//массив окружающих клеток
		self_x = item.x,//координата x внутри таблицы
		self_y = item.y;//координата y внутри таблицы

	for ( let i = self_x - 1; i <= self_x + 1; i++){//цикл по клеткам вокруг
		for ( let j = self_y - 1; j <= self_y + 1; j++){
			if ( i == self_x && j == self_y ) continue;//если центр то ничего не делать
			x = i;
			y = j;
			//замыкание границ поля
			if ( i < 0 ) x = width - 1;
			if ( i > width - 1 ) x = 0;
			if ( y < 0 ) y = height - 1;
			if ( y > height - 1 ) y = 0;
			surroundingArray.push(fullArray[x][y]);
		}
	}
	return surroundingArray;

}
//----------------------------------------------createTable( height, width, container, cellSize)-----------------------
//создание поля и вставка на страницу
function createTable( height, width, container, cellSize){
	let gameTable = $('<table/>', {class: 'game-table mx-auto'});

	for ( let i = 0; i < height; i++ ){
		let tableRow = $('<tr/>');
		for ( let j = 0; j < width; j++ ){
			let tableCell = $('<td/>',{class: 'cell-block'});
			tableCell.append( $('<div/>',{class: 'circle'}) );
			tableRow.append(tableCell);
		}
		gameTable.append(tableRow);
	}

	container.append(gameTable);

	$('.circle').css({"width": cellSize, "height": cellSize});
}
//----------------------------------------------initCells( array, width, height, app)-----------------------
//забить массив клетками
function initCells( array, width, height, app){
	let table = app.find('.game-table');

	for ( let x = 0; x < width; x++ ){
		for ( let y = 0; y < height; y++ ){
			array[x][y] = new Cell( x, y, table.find('tr').eq(y).find('td').eq(x)[0] );
		}
	}
}
//----------------------------------------------getAliveCells( fullArray )-----------------------
//проверить клетки на живость
function getAliveCells( fullArray ){
	let newActiveCellsArray = [];

	for ( let x = 0; x < fullArray.length; x++){
		for ( let y = 0; y < fullArray[0].length; y++ ){
			fullArray[x][y].state = "dead";//очистить статус нод, если был прожат stopGame во...
			if ( fullArray[x][y].node.classList.contains('cell-block_alive') ){
				fullArray[x][y].state = "alive";
				newActiveCellsArray.push(fullArray[x][y]);
			}
		}
	}
	return newActiveCellsArray;
}
//----------------------------------------------readTextFile( file, callback )-----------------------
//читать json файл с диска
function readTextFile( file, callback ){
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/json");
	rawFile.open("GET", file, true );
	rawFile.onreadystatechange = function(){
		if ( rawFile.readyState === 4 && rawFile.status == "200" ){
			callback( rawFile.responseText );
		}
	}
	rawFile.send(null);
}