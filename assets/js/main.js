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
var food_specialty = [];

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
	directionsDisplay = new google.maps.DirectionsRenderer;

	directionsDisplay.setMap(map);

	getCurrentLocation();
	getRestaurantsInCebu();
	createDrawingManager();
}

/**
 * Get restaurants in cebu
 */
function getRestaurantsInCebu() {
	// text search request
	let request = {
		query: 'restaurant in Cebu',
		type: 'restaurant'
	};
	service.textSearch(request, function(results, status, pagetoken) {
	 	if (status === google.maps.places.PlacesServiceStatus.OK) {
		    for (let i = 0; i < results.length; i++) {
		        restaurants.push(results[i]);
		        /*
		    	// save restaurant details in array
		    	let req = {
		          	placeId: results[i].place_id
		        };
		    	service.getDetails(req, function(place, stat) {
		    		if (stat === google.maps.places.PlacesServiceStatus.OK)
		    			restaurants.push(place);
		    		else
		    			restaurants.push(results[i]);
		    	});
		    	*/

		    	createRestaurantListingHTML(results[i]);
		    	createRestaurantMarker(results[i]);
		    }

		    // get next page
		    if (pagetoken.hasNextPage) {
		        pagetoken.nextPage();
		    } else {
		    	addChartData();
		    }
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
 */
function createRestaurantMarker(place) {
	let marker = new google.maps.Marker({
	  	map: map,
	  	position: place.geometry.location,
	  	icon: '/restaurant/assets/images/restaurant-location-pin.png'
	});

	google.maps.event.addListener(marker, 'click', function() {
		let food_specialty_html = '';
		if(food_specialty[place.place_id])
			food_specialty_html = '<p>'+food_specialty[place.place_id]+'</p>';

		let content = '<div class="infowindow">' +
			'<div class="row">' +
				'<img class="place-icon" src="' + place.icon + '"> ' +
				'<b class="title">' + place.name + '</b>' +
				food_specialty_html +
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
	        directionsDisplay = null;
		});
	});

	// save marker
	markers.push(marker);
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
	deleteMarkers(shapeMarkers);
	deleteAllShape();
	showMarkers();
}

/**
 * Handle change event to draw shape
 */
function handleChangeDrawShape() {
	hideMarkers();
	drawingManager.setOptions({
	  drawingControl: true
	});
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
 */
function deleteMarkers(markerList) {
    //Loop through all the markers and remove
    for (let i = 0; i < markerList.length; i++) {
        markerList[i].setMap(null);
    }
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
			food_specialty[parent_li.getAttribute('data-placeid')] = input.value;

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
						'<tbody><tr>' +
							'<td class="td-label">' +
								'Food Specialty' +
							'</td>' +
							'<td class="td-actions">' +
								'<input type="text" readonly="" name="food_specialty"> ' +
								'<input type="button" value="Edit" class="btn-edit" onclick="onClickEdit(this)">' +
							'</td>' +
						'</tr>' +
						'<tr>' +
							'<td class="td-label">' +
								'Visitor' +
							'</td>' +
							'<td class="td-actions">' +
								'<input type="number" readonly="" name="visitor" min="0"> ' +
								'<input type="button" value="Edit" class="btn-edit" onclick="onClickEdit(this)">' +
							'</td>' +
						'</tr>' +
						'<tr>' +
							'<td class="td-label">' +
								'Revenue' +
							'</td>' +
							'<td class="td-actions">' +
								'<input type="number" readonly="" name="revenue" min="0"> ' +
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