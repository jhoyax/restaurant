var map;
var service;
var infowindow;
var restaurants = [];
var currentPosition;
var directionsService;
var directionsDisplay;
var drawingManager;
var markers = [];
var allShape = [];
var shapeMarkers = [];
var foodSpecialty = [];

var restaurantsLabel = [];
var visitorData = [];
var revenueData = [];
var lineChart = new Chart(document.getElementById("line-chart"), {
	type: 'line',
	data: {
		labels: restaurantsLabel
	}
});

/**
 * Initialize map
 */
function initMap() {
	let cebu = new google.maps.LatLng(10.3787569, 123.7762541);

	map = new google.maps.Map(document.getElementById('map'), {
		center: cebu,
	  	zoom: 10
	});

	infowindow = new google.maps.InfoWindow();
	service = new google.maps.places.PlacesService(map);
	directionsService = new google.maps.DirectionsService;
	directionsDisplay = new google.maps.DirectionsRenderer({
		suppressMarkers: true
	});

	getCurrentLocation();
	getRestaurantsInCebu();
	createDrawingManager();
}

/**
 * Get restaurants in cebu
 */
function getRestaurantsInCebu(query = '') {
	// text search request
	let current_specialty = query;
	if(query != '')
		current_specialty = query + ' ';

	let request = {
		query: current_specialty + 'restaurant in Cebu',
		type: 'restaurant'
	};
	service.textSearch(request, function(results, status, pagetoken) {
	 	if (status === google.maps.places.PlacesServiceStatus.OK) {
		    for (let i = 0; i < results.length; i++) {
		    	let result = results[i];

		        // generate random data for vistor and revenue
		        let min=1, max=500, random = 0;
		    	random =Math.floor(Math.random() * (+max - +min)) + +min
		    	result.visitor = random;
		    	random =Math.floor(Math.random() * (+max - +min)) + +min
		    	result.revenue = random;
		    	result.specialty = query;

		    	createRestaurantListingHTML(result);
		    	result.marker = createRestaurantMarker(result);

		        restaurants.push(result);
		    }

		    // get next page
		    if (pagetoken.hasNextPage) {
		        pagetoken.nextPage();
		    }
		  	addChartData();
	  	}
	});
}

/**
 * Get Current Location
 */
function getCurrentLocation() {
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function(position) {
				currentPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				createCurrentLocationMarker();
			},
			function(error) {
				if(error) {
					// set manual location if no position
					currentPosition = new google.maps.LatLng(10.3051321,123.9475856);
					createCurrentLocationMarker();
				}
			}
		);
	}
}

/**
 * Create drawing manager
 */
function createDrawingManager() {
	let drawingControl = true;
	let view = document.querySelector('input[name="view"]:checked').value;
	if(view == 'restaurants_in_cebu')
		drawingControl = false;

	drawingManager = new google.maps.drawing.DrawingManager({
      	drawingControl: drawingControl,
      	drawingControlOptions: {
	        position: google.maps.ControlPosition.TOP_CENTER,
	        drawingModes: ['circle', 'rectangle']
      	},
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
		// save overlay
		allShape.push(event);

		let lat = event.overlay.getBounds().getCenter().lat();
		let lng = event.overlay.getBounds().getCenter().lng();
		let shapeCenter = new google.maps.LatLng(lat, lng);

		let request = {
			bounds: event.overlay.getBounds(),
			type: 'restaurant'
		};
		let totalResto = 0;
		service.nearbySearch(request, function(results, status, pagetoken) {
			totalResto += results.length;
		    // get next page
		    if (pagetoken.hasNextPage) {
		        pagetoken.nextPage();
		    } else {
				let marker = new google.maps.Marker({
		          	position: shapeCenter,
		          	label: {
		          		text: String(totalResto),
		          		color: "white"
		          	},
		          	map: map,
			  		icon: '/restaurant/assets/images/shaper-marker.png'
		        });

				// save marker
				shapeMarkers.push(marker);
		    }
		});
	});
}

/**
 * Create Marker
 * 
 * @param {object} place - Place Result
 * @return {object} Returns marker object
 */
function createRestaurantMarker(place) {
	let marker = new google.maps.Marker({
	  	map: map,
	  	position: place.geometry.location,
	  	icon: '/restaurant/assets/images/restaurant-location-pin.png'
	});

	google.maps.event.addListener(marker, 'click', function() {
		let foodSpecialtyHTML = '';
		if(foodSpecialty[place.place_id])
			foodSpecialtyHTML = '<p>'+foodSpecialty[place.place_id]+'</p>';

		let content = '<div class="infowindow">' +
			'<div class="row">' +
				'<img class="place-icon" src="' + place.icon + '"> ' +
				'<b class="title">' + place.name + '</b>' +
				foodSpecialtyHTML +
			'</div>' +
			'<div class="row">' +
				'<a href="javascript:void(0)" id="getDirection" data-placeid="'+ place.place_id +'">' +
					'<img src="/restaurant/assets/images/direction.png"> Direction' +
				'</a>' +
			'</div>' +
			'</div>';
	  	infowindow.setContent(content);
	  	infowindow.open(map, this);
	  	
	  	// infowindow dom ready event listener
		google.maps.event.addListener(infowindow, 'domready', function() {
			// add event listener when Direction button is click
			document.getElementById('getDirection').addEventListener('click', onClickDirection);
		});

		// infowindow click close button event listener
		google.maps.event.addListener(infowindow, 'closeclick', function() {
			// remove direction in map
	        directionsDisplay.setMap(null);
		});
	});

	// save marker
	markers.push(marker);

	return marker;
}

/**
 * Create Marker for Current Location
 */
function createCurrentLocationMarker() {
	// update map center
	map.setCenter(currentPosition);

	let marker = new google.maps.Marker({
	  	map: map,
	  	position: currentPosition,
	  	icon: '/restaurant/assets/images/current-location.png'
	});

	google.maps.event.addListener(marker, 'click', function() {
		let content = '<div class="infowindow" align="center">' +
				'<b class="title">You</b>' +
			'</div>';
	  	infowindow.setContent(content);
	  	infowindow.open(map, this);
	});

	// save marker
	markers.push(marker);
}

/**
 * Click event in Direction button
 */
function onClickDirection() {
	directionsService.route({
    	origin: {location: currentPosition},
      	destination: {placeId: this.getAttribute("data-placeid")},
      	travelMode: 'DRIVING'
    }, function(response, status) {
      	if (status === 'OK') {
			// update map zoom and center
			map.setCenter(currentPosition);
			map.setZoom(12);

			directionsDisplay.setMap(map);
        	directionsDisplay.setDirections(response);
      	} else {
        	window.alert('Directions request failed due to ' + status);
      	}
    });
}

/**
 * Handle change event to show restaurants in cebu
 */
function handleChangeRestaurantInCebu() {
	drawingManager.setOptions({
		drawingMode: null,
	  	drawingControl: false
	});

	markers = deleteMarkers(markers);
	shapeMarkers = deleteMarkers(shapeMarkers);

	directionsDisplay.setMap(null);

	deleteAllShape();

	// clear data when switching filter
	restaurants = [];
	addChartData();
	document.getElementById('restaurant-listing').innerHTML = '';
	document.getElementById('specialty-list').querySelectorAll('li > label > input[type="checkbox"]').forEach(function(element){
		element.checked = false;
	});

	getCurrentLocation();

	// plot all restaurant in cebu
	getRestaurantsInCebu();

	document.getElementById('specialty-list').style.display = "none";
}

/**
 * Handle change event to draw shape
 */
function handleChangeDrawShape() {
	drawingManager.setOptions({
	  drawingControl: true
	});

	markers = deleteMarkers(markers);

	directionsDisplay.setMap(null);

	// clear data when switching filter
	restaurants = [];
	addChartData();
	document.getElementById('restaurant-listing').innerHTML = '';
	document.getElementById('specialty-list').querySelectorAll('li > label > input[type="checkbox"]').forEach(function(element){
		element.checked = false;
	});

	document.getElementById('specialty-list').style.display = "none";
}

/**
 * Handle change event to show restaurants in cebu by specialty
 */
function handleChangeRestaurantSpecialtyInCebu() {
	drawingManager.setOptions({
		drawingMode: null,
	  	drawingControl: false
	});

	markers = deleteMarkers(markers);
	shapeMarkers = deleteMarkers(shapeMarkers);

	directionsDisplay.setMap(null);

	deleteAllShape();

	// clear data when switching filter
	restaurants = [];
	addChartData();
	document.getElementById('restaurant-listing').innerHTML = '';

	getCurrentLocation();
	document.getElementById('specialty-list').style.display = "block";
}

/**
 * Handle change event to show specialty
 */
function handleChangeSpecialty(el) {
	if(el.checked) {
		getRestaurantsInCebu(el.value);
	} else {
		let newRestaurants = [];
		// remove markers of restaurant that has the current specialty
		for (let i=0; i < restaurants.length; i++) {
			if(restaurants[i].specialty == el.value)
			{
				// remove marker
				restaurants[i].marker.setMap(null);
				infowindow.close();
				// remove in listing
				document.getElementById('restaurant-listing').querySelector('li[data-placeid="' + restaurants[i].place_id + '"]').remove();
			} else {
				newRestaurants.push(restaurants[i]);
			}
		}
		restaurants = newRestaurants;
		addChartData();
	}
}

/**
 * Hide markers in map
 */
function hideMarkers() {
    //Loop through all the markers and remove
    for (let i = 0; i < markers.length; i++) {
        markers[i].setVisible(false);
    }
    infowindow.close();
}

/**
 * Show markers in map
 */
function showMarkers() {
    //Loop through all the markers and remove
    for (let i = 0; i < markers.length; i++) {
        markers[i].setVisible(true);
    }
}

/**
 * Delete markers in map
 * 
 * @param {arr} markerList - Marker List
 * @return {arr} Return blank array
 */
function deleteMarkers(markerList) {
    //Loop through all the markers and remove
    for (let i = 0; i < markerList.length; i++) {
        markerList[i].setMap(null);
    }
    
    infowindow.close();

    return [];
}

/**
 * Show markers in map
 */
function deleteAllShape() {
  for (let i = 0; i < allShape.length; i++) {
    allShape[i].overlay.setMap(null);
  }
  allShape = [];
}

/**
 * Click event in Save button
 */
function onClickSave(el) {
	let parent_td = el.closest('td.td-actions');
	viewMode(parent_td);

	// save data
	let parent_li = parent_td.closest('tr').closest('table').closest('li');
	let input = parent_td.querySelector("input");
	let parent_ul = parent_li.closest('ul#restaurant-listing');
	let li_index = Array.prototype.indexOf.call(parent_ul.querySelectorAll('li'), parent_li);

	if(restaurants[li_index])
	{
		restaurants[li_index][input.name] = input.value;

		// refresh chart only in visitor and revenue changes
		if(input.name == 'visitor' || input.name == 'revenue')
			addChartData();
		if(input.name == 'food_specialty')
		{
			foodSpecialty[parent_li.getAttribute('data-placeid')] = input.value;

			// close info window to refresh content
			infowindow.close();
		}
	}
}

/**
 * Click event in Cancel button
 */
function onclickCancel(el) {
	let parent_td = el.closest('td.td-actions');
	viewMode(parent_td);

	parent_td.querySelector("input").value = parent_td.querySelector("input").getAttribute("data-orig");
}

/**
 * Click event in Edit button
 */
function onClickEdit(el) {
	let parent_td = el.closest('td.td-actions');
	removeButtonsFromParent(parent_td);
	editMode(parent_td);
}

/**
 * View mode for input text and show edit input button
 */
function viewMode(parent_td) {
	removeButtonsFromParent(parent_td);

	// add edit button
	let node = document.createElement("input");
	node.value = "Edit";
	node.type = "button";
	node.setAttribute("class", "btn-edit");
	node.setAttribute("onclick", "onClickEdit(this)");
	parent_td.appendChild(node);

	//make textbox readonly
	parent_td.querySelector("input").setAttribute("readonly", "readonly");
}

/**
 * Remove input button from parent
 */
function removeButtonsFromParent(parent_td) {
	let buttons = parent_td.querySelectorAll("input[type=button]");

	// remove save and cancel button
	buttons.forEach(e => parent_td.removeChild(e));
}

/**
 * View mode for input text and show edit input button
 */
function editMode(parent_td) {
	removeButtonsFromParent(parent_td);

	// add save button
	let node1 = document.createElement("input");
	node1.value = "Save";
	node1.type = "button";
	node1.setAttribute("class", "btn-save");
	node1.setAttribute("onclick", "onClickSave(this)");
	parent_td.appendChild(node1);

	// add cancel button
	let node2 = document.createElement("input");
	node2.value = "Cancel";
	node2.type = "button";
	node2.setAttribute("class", "btn-cancel");
	node2.setAttribute("onclick", "onclickCancel(this)");
	parent_td.appendChild(node2);

	//remove attribute readonly
	parent_td.querySelector("input").setAttribute("data-orig", parent_td.querySelector("input").value);
	parent_td.querySelector("input").removeAttribute("readonly");
}

/**
 * Add list of restaurant in ul#restaurant-listing element
 */
function createRestaurantListingHTML(place) {
	let listing = document.getElementById('restaurant-listing');
	let html = '<li data-placeid="' + place.place_id + '">' +
					'<h3>' + place.name + '</h3>' +
					'<table id="restaurant-details-table">' +
						'<tr>' +
							'<td class="td-label">' +
								'Visitor' +
							'</td>' +
							'<td class="td-actions">' +
								'<input type="number" readonly="" name="visitor" min="0" value="' + place.visitor + '"> ' +
								'<input type="button" value="Edit" class="btn-edit" onclick="onClickEdit(this)">' +
							'</td>' +
						'</tr>' +
						'<tr>' +
							'<td class="td-label">' +
								'Revenue' +
							'</td>' +
							'<td class="td-actions">' +
								'<input type="number" readonly="" name="revenue" min="0" value="' + place.revenue + '"> ' +
								'<input type="button" value="Edit" class="btn-edit" onclick="onClickEdit(this)">' +
							'</td>' +
						'</tr>' +
					'</tbody></table>' +
				'</li>';
	listing.insertAdjacentHTML('beforeend', html);
}

/**
 * Add chart data
 */
function addChartData() {
	restaurantsLabel = [];
	visitorData = [];
	revenueData = [];
	for (let i=0; i < restaurants.length; i++) {
		// add chart labels and data
		restaurantsLabel.push(restaurants[i].name);
		if(restaurants[i].visitor)
			visitorData.push(restaurants[i].visitor);
		else
			visitorData.push(0);

		if(restaurants[i].revenue)
			revenueData.push(restaurants[i].revenue);
		else
			revenueData.push(0);
	}

	lineChart.data = {
		labels: restaurantsLabel,
		datasets: [{ 
				data: visitorData,
				label: "Visitor",
				borderColor: "#3e95cd",
				fill: false
			}, { 
				data: revenueData,
				label: "Revenue",
				borderColor: "#8e5ea2",
				fill: false
			}
		]
	};
	lineChart.update();
}

/**
 * Toggle Side Panel
 */
function toggleSidePanel(el) {
	if(el.getAttribute('data-stat') == 'close') {
		el.innerHTML = "◀";
		el.style.marginLeft = "400px";
		document.getElementById('side-panel').style.width = "400px";
		document.getElementById('main').style.marginLeft = "400px";
		el.setAttribute('data-stat', 'open');
		el.setAttribute('title', 'Collapse Side Panel');
	} else {
		el.innerHTML = "▶";
		el.style.marginLeft = "0";
		document.getElementById('side-panel').style.width = "0";
		document.getElementById('main').style.marginLeft = "0";
		el.setAttribute('data-stat', 'close');
		el.setAttribute('title', 'Expand Side Panel');
	}
}

// accordion function
var acc = document.getElementsByClassName("accordion");
for (let i = 0; i < acc.length; i++)
{
	acc[i].addEventListener("click", function() {
		this.classList.toggle("active");
		var panel = this.nextElementSibling;;
		if (panel.classList.contains('hide')){
			panel.classList.remove('hide');
		} else {
			panel.classList.add('hide');
		}
	});
}


// When the user scrolls down 20px from the top of the document, show the button
document.getElementById('side-panel').onscroll = function() {
	scrollFunction()
};

function scrollFunction() {
  if (document.getElementById('side-panel').scrollTop > 10)
    document.getElementById("scrollTOp").style.display = "block";
  else
    document.getElementById("scrollTOp").style.display = "none";
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  scrollTo(document.getElementById('side-panel'), 0, 500);
}


// Script from here: https://gist.github.com/andjosh/6764939
function scrollTo(element, to, duration) {
    var start = element.scrollTop,
        change = to - start,
        currentTime = 0,
        increment = 20;

    var animateScroll = function(){
        currentTime += increment;
        var val = Math.easeInOutQuad(currentTime, start, change, duration);
        element.scrollTop = val;
        if(currentTime < duration) {
            setTimeout(animateScroll, increment);
        }
    };
    animateScroll();
}

//t = current time
//b = start value
//c = change in value
//d = duration
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
};
// END - https://gist.github.com/andjosh/6764939