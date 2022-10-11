const ctx = document.getElementById("myChart").getContext("2d");
const selectSite = document.querySelector("#selectSite");
const monsoonEd = document.querySelector("#monsoonEd");
const monsoonEdBtn = document.querySelector("#monsoonEdBtn");
const monsoonEdSelect = document.querySelector("#monsoonEdSelect");
const monsoonEdPDF = document.querySelector("#monsoonEdPDF");
const seasonOverview = document.querySelector("#seasonOverview");
const seasonOverviewBtn = document.querySelector("#seasonOverviewBtn");
const monsoonStats = document.querySelector("#monsoonStats");
const monsoonStatsBtn = document.querySelector("#monsoonStatsBtn");
const monsoonStatsSite = document.querySelector("#monsoonStatsSite");
const monsoonStatsPor = document.querySelector("#monsoonStatsPor");
const precipTable = document.querySelector("#precipTable");
const precipTop10 = document.querySelector("#precipTop10");
const haywoodLink = document.querySelector("#haywoodLink");
const haywoodPlot = document.querySelector("#haywoodPlot");
const startDates = document.querySelector("#startDates");
const precipMaps = document.querySelector("#precipMaps");
const precipMapsBtn = document.querySelector("#precipMapsBtn");
const dewpointYear = document.querySelector("#dewpointYear");
const precipYear = document.querySelector("#precipYear");
const precipRegion = document.querySelector("#precipRegion");

const lightningRegionSelect = document.querySelector("#lightningRegionSelect");
const lightningLineChart = document.getElementById("lightningLineChart").getContext("2d");
const lightningBarChart = document.getElementById("lightningBarChart").getContext("2d");
const lastLightningUpdate = document.querySelector("#lastLightningUpdate");
const lightningRegionsImage = document.querySelector("#lightningRegionsImage");
const lightningRegionsLink = document.querySelector("#lightningRegionsLink");

// get host url for dev or prod routing
const fileRouting = (() => {
	const isNWS = () => {
		const host = window.location.host;
		if (host.includes("www.weather.gov")) {
			return true;
		} else {
			return false;
		}
	};

	const getRoot = (rootFolder, nestedFolder = "") => {
		if (isNWS()) {
			if (nestedFolder.length > 0) {
				return `../${rootFolder}/twc/${nestedFolder}/`;
			} else {
				return `../${rootFolder}/twc/`;
			}
		} else {
			return `./${nestedFolder}/`;
		}
	};

	return { getRoot };
})();

let avgDewpoints = {};
fetch(`${fileRouting.getRoot("source", "monsoon")}avg-dewpoints.json`)
	.then((res) => res.json())
	.then((data) => {
		avgDewpoints = data;
		fillPrecipSites();
		getPrecipData.fetchNew(precipRegion.value);
		lightningControls.init();
	});

// change to update displays
monsoonEdBtn.addEventListener("click", () => adjustDisplay("monsoonEd"));
seasonOverviewBtn.addEventListener("click", () => adjustDisplay("seasonOverview"));
monsoonStatsBtn.addEventListener("click", () => adjustDisplay("monsoonStats"));
precipMapsBtn.addEventListener("click", () => adjustDisplay("precipMaps"));

// setup years for dew point and precip selectors
fillYears(dewpointYear, 2017);
fillYears(precipYear, 1975);

// apply/remove d-none to displays depending on what was selected
function adjustDisplay(selected) {
	const temp = document.querySelectorAll(".displays");
	temp.forEach((display) => {
		if (display.id === selected) {
			display.classList.remove("d-none");
		} else {
			display.classList.add("d-none");
		}
	});
	if (selected === "monsoonStats") {
		newTableController.createTable("ktus");
	}
}

// select element that switches between the different PDFs
monsoonEdSelect.addEventListener("change", (e) => {
	monsoonEdPDF.src = `${fileRouting.getRoot("media", "monsoon")}${e.target.value}.pdf`;
});

// attempt at custom image background
const bgImage = new Image();
bgImage.src = `${fileRouting.getRoot("images", "monsoon")}150px-NOAA-Logo.png`;
const bgImage2 = new Image();
bgImage2.src = `${fileRouting.getRoot("images", "monsoon")}150px-NWS-Logo.png`;

// plugin required for the chart background image
const plugin = {
	id: "custom_canvas_background_image",
	beforeDraw: (chart) => {
		if (bgImage.complete) {
			const ctx = chart.ctx;
			ctx.drawImage(bgImage, 10, 10, 50, 50);
			ctx.drawImage(bgImage2, 645, 10, 50, 50);
		} else {
			bgImage.onload = () => chart.draw();
		}
	},
};

// makes background canvas white instead of transparent
const plugin2 = {
	id: "custom_canvas_background_color",
	beforeDraw: (chart) => {
		const { ctx } = chart;
		ctx.save();
		ctx.globalCompositeOperation = "destination-over";
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, chart.width, chart.height);
		ctx.restore();
	},
};

// instantiate dewpoint chart
const dewpointChart = new Chart(ctx, {
	type: "line",
	data: {
		labels: [],
		datasets: [
			{
				label: "Dewpoint",
				data: [],
				backgroundColor: ["rgba(255, 99, 132, 0.7)"],
				borderColor: ["rgba(255, 99, 132, 1)"],
				borderWidth: 1,
			},
			{
				label: "Avg Dewpoint",
				data: [],
				backgroundColor: ["rgba(99, 99, 132, 0.7)"],
				borderColor: ["rgb(99, 99, 132)"],
				borderWidth: 1,
				radius: 0,
			},
		],
	},
	plugins: [plugin, plugin2],
	options: {
		maintainAspectRatio: false,
		plugins: {
			title: {
				display: true,
				text: `${
					selectSite.options[selectSite.selectedIndex].text
				} - Avg Daily Dewpoint Tracker`,
				font: {
					size: 22,
				},
			},
			zoom: {
				pan: {
					enabled: true,
					mode: "x",
					modifierKey: "alt",
				},
				limits: {
					x: {
						minRange: 10,
					},
				},
				zoom: {
					mode: "x",
					drag: {
						enabled: true,
					},
					wheel: {
						enabled: true,
						modifierKey: "ctrl",
					},
				},
			},
		},
		scales: {
			y: {
				suggestedMin: 25,
				suggestedMax: 75,
			},
		},
	},
});

selectSite.addEventListener("change", () => getData());
dewpointYear.addEventListener("change", () => getData());

// get data from synoptic data
getData();

function getData() {
	const selectedYear = dewpointYear.value;
	// dates begin one hour before the start of the season
	fetch(
		`https://api.synopticdata.com/v2/stations/timeseries?stid=${selectSite.value}&start=${selectedYear}06150700&end=${selectedYear}10010700&units=english&hfmetars=0&vars=dew_point_temperature&obtimezone=local&token=e56e04d76bad41229d6c0f7076d54d59`
	)
		.then((res) => res.json())
		.then((data) => {
			const dates = data.STATION[0].OBSERVATIONS.date_time;
			const values = data.STATION[0].OBSERVATIONS.dew_point_temperature_set_1;
			calcDailyAvg(dates, values);
		});
}

function calcDailyAvg(datesArr, valuesArr) {
	let finalValuesArr = [];
	let finalDatesArr = [];
	// populate all the dates into the array
	datesArr.forEach((date) => {
		let reg = new RegExp(date.substring(0, 10), "g");
		if (!finalDatesArr.some((item) => reg.test(item))) {
			finalDatesArr.push(date.substring(0, 10));
		}
	});
	// set current date
	let currentDate = datesArr[0].substring(0, 10);
	let currentValuesArr = [];

	const calcAvg = (date, i) => {
		// calculate avg
		const sum = currentValuesArr.reduce((a, b) => a + b, 0);
		const avg = +(sum / currentValuesArr.length).toFixed(1);
		// set final values
		finalValuesArr.push(avg);
		// reset values and establish new day
		currentDate = date.substring(0, 10);
		currentValuesArr = [];
		currentValuesArr.push(valuesArr[i]);
	};

	for (const [i, date] of datesArr.entries()) {
		// if date matches current date, add value to array
		if (date.substring(0, 10) === currentDate) {
			// only add value to array if it is not null/undefined
			if (valuesArr[i]) {
				currentValuesArr.push(valuesArr[i]);
			}
			if (datesArr.length - 1 === i) {
				// if last date, calculate avg and set finalvalues
				calcAvg(date, i);
			}
		} else {
			calcAvg(date, i);
		}
	}
	// update chart labels and data
	dewpointChart.data.labels = finalDatesArr;
	dewpointChart.data.datasets[0].data = finalValuesArr;
	dewpointChart.options.plugins.title.text = `${
		selectSite.options[selectSite.selectedIndex].text
	} - Avg Daily Dewpoint Tracker`;
	// update historical avg dewpoints
	const avgDewpointArr = [];
	for (let i = 0; i < finalDatesArr.length; i++) {
		avgDewpointArr.push(avgDewpoints[selectSite.value].dewpoints.avg[i]);
	}
	dewpointChart.data.datasets[1].data = avgDewpointArr;
	dewpointChart.data.datasets[1].label = `Avg Dewpoint (${
		avgDewpoints[selectSite.value].dewpoints.por
	})`;
	dewpointChart.update();
}

// click listener for changing site on monsoon stats
monsoonStatsSite.addEventListener("change", (e) => {
	newTableController.createTable(e.target.value);
});

// controls the monsoon stats tables
const newTableController = (() => {
	// pulls monthly data from xmacis api based on given site
	// starting date is 06-15. It will give a cumulative total with a
	// readout at the end of every month
	// second element is the normal rainfall amounts for the month
	const getData = async (site) => {
		const currentYear = new Date().getFullYear();
		const url = "https://data.rcc-acis.org/StnData";
		const params = {
			sid: avgDewpoints[site].xmacisPrecip.id,
			sdate: "1850-9-30",
			edate: `${currentYear}-9-30`,
			meta: "valid_daterange",
			elems: [
				{
					name: "pcpn",
					interval: [0, 1, 0],
					duration: "std",
					season_start: "06-15",
					reduce: {
						reduce: "sum",
					},
				},
				{
					name: "pcpn",
					interval: [0, 1, 0],
					duration: "std",
					season_start: "06-15",
					reduce: {
						reduce: "sum",
					},
					normal: 1,
				},
			],
		};
		const finalUrl = url + "?params=" + JSON.stringify(params);
		const response = await fetch(finalUrl);
		const json = await response.json();
		console.log(json);
		return json;
	};

	const addTableRow = (currentDataObj, isNormal) => {
		const tr = document.createElement("tr");
		if (isNormal) {
			tr.style.backgroundColor = "#FEFDCD";
			tr.style.fontWeight = 700;
		}
		for (let title of ["year", "jun", "jul", "aug", "sep", "total"]) {
			let value;
			const td = document.createElement("td");
			if (isNormal && title === "year") {
				value = currentDataObj[title];
			} else {
				value = Number(currentDataObj[title]);
			}
			if (title !== "year") {
				td.textContent = `${value.toFixed(2)}"`;
			} else {
				td.textContent = value;
			}
			tr.append(td);
		}
		return tr;
	};

	// populates text and por for selected site
	function popPor(site) {
		const currentYear = new Date().getFullYear();
		monsoonStatsPor.innerHTML = `<b>Monsoon Statitics for ${
			monsoonStatsSite.options[monsoonStatsSite.selectedIndex].text
		} (${avgDewpoints[site].xmacisPrecip.startYear} - ${currentYear})</b>`;
	}

	// populates top10 table of wettest and driest monsoons
	const addTop10Table = (top10array) => {
		// get wettest and driest into top 10 arrays
		top10array.sort((a, b) => a.total - b.total);
		const driest10 = top10array.slice(0, 10);
		const wettest10 = top10array.slice(-10);
		wettest10.reverse();
		// create header
		const tr = document.createElement("tr");
		const th1 = document.createElement("th");
		const th2 = document.createElement("th");
		th1.setAttribute("colspan", "2");
		th2.setAttribute("colspan", "2");
		th2.style = "background: #f1bc93";
		th1.textContent = "Top 10 Wettest Monsoons";
		th2.textContent = "Top 10 Driest Monsoons";
		tr.append(th1, th2);
		precipTop10.append(tr);
		// loop through to make 5 rows with wettest and driest
		// i = rows, j = columns
		for (let i = 0; i < 5; i++) {
			const tr = document.createElement("tr");
			for (let j = 0; j < 4; j++) {
				const td = document.createElement("td");
				switch (j) {
					case 0:
						td.textContent = `${i + 1}) ${wettest10[i].total.toFixed(2)}" / ${
							wettest10[i].year
						}`;
						break;
					case 1:
						td.textContent = `${i + 6}) ${wettest10[i + 5].total.toFixed(2)}" / ${
							wettest10[i + 5].year
						}`;
						break;
					case 2:
						td.textContent = `${i + 1}) ${driest10[i].total.toFixed(2)}" / ${
							driest10[i].year
						}`;
						break;
					case 3:
						td.textContent = `${i + 6}) ${driest10[i + 5].total.toFixed(2)}" / ${
							driest10[i + 5].year
						}`;
						break;
					default:
						console.log("whoops");
						break;
				}
				tr.append(td);
			}
			precipTop10.append(tr);
		}
	};

	// processes data and adds to table
	const processData = (json, site) => {
		const table = precipTable.querySelector("table");
		const startingYear = avgDewpoints[site].xmacisPrecip.startYear;
		const monthlyData = json.data;
		let currentDataObj = {
			year: 0,
			jun: 0,
			jul: 0,
			aug: 0,
			sep: 0,
			total: 0,
		};
		let dataNormalsObj = {
			year: "Normal",
			jun: 0,
			jul: 0,
			aug: 0,
			sep: 0,
			total: 0,
		};
		const top10array = [];
		// loop through each month, check the year and find correct monsoon month data
		for (let monthData of monthlyData) {
			// is this a new year? if so, reset year and monthArr
			if (currentDataObj.year !== Number(monthData[0].substring(0, 4))) {
				currentDataObj.year = Number(monthData[0].substring(0, 4));
				currentDataObj.jun = 0;
				currentDataObj.jul = 0;
				currentDataObj.aug = 0;
				currentDataObj.sep = 0;
			}
			// check the month. Since data has all months of the year and not just the monsoon,
			// only need the data from these months, then add to currentDataObj
			if (currentDataObj.year >= startingYear) {
				switch (monthData[0].substring(5, 7)) {
					case "06":
						if (monthData[1] === "T" || monthData[1] === "M") {
							currentDataObj.jun = 0;
							dataNormalsObj.jun = 0;
						} else {
							currentDataObj.jun = Number(monthData[1]);
							dataNormalsObj.jun = Number(monthData[2]);
						}
						break;
					case "07":
						if (monthData[1] === "T" || monthData[1] === "M") {
							currentDataObj.jul = 0;
							dataNormalsObj.jul = 0;
						} else {
							currentDataObj.jul = +(monthData[1] - currentDataObj.jun).toFixed(2);
							dataNormalsObj.jul = +(monthData[2] - dataNormalsObj.jun).toFixed(2);
						}
						break;
					case "08":
						if (monthData[1] === "T" || monthData[1] === "M") {
							currentDataObj.aug = 0;
							dataNormalsObj.aug = 0;
						} else {
							currentDataObj.aug = +(
								monthData[1] -
								currentDataObj.jul -
								currentDataObj.jun
							).toFixed(2);
							dataNormalsObj.aug = +(
								monthData[2] -
								dataNormalsObj.jul -
								dataNormalsObj.jun
							).toFixed(2);
						}
						break;
					case "09":
						if (monthData[1] === "T" || monthData[1] === "M") {
							currentDataObj.sep = 0;
							dataNormalsObj.sep = 0;
						} else {
							currentDataObj.sep = +(
								monthData[1] -
								currentDataObj.aug -
								currentDataObj.jul -
								currentDataObj.jun
							).toFixed(2);
							dataNormalsObj.sep = +(
								monthData[2] -
								dataNormalsObj.aug -
								dataNormalsObj.jul -
								dataNormalsObj.jun
							).toFixed(2);
						}
						currentDataObj.total =
							monthData[1] === "T" || monthData[1] === "M" ? 0 : +monthData[1];
						dataNormalsObj.total =
							monthData[2] === "T" || monthData[2] === "M" ? 0 : +monthData[2];
						// add to top10 array
						top10array.push({
							year: currentDataObj.year,
							total: currentDataObj.total,
						});
						// fill table row with data
						table.prepend(addTableRow(currentDataObj, false));
						break;
					default:
						break;
				}
			}
		}
		// add normals to table
		table.prepend(addTableRow(dataNormalsObj, true));
		// make top 10 wet/dry
		addTop10Table(top10array);
	};

	// creates header row
	const makeTableHeader = () => {
		const tr = document.createElement("tr");
		for (let title of ["Year", "Jun", "Jul", "Aug", "Sep", "Total"]) {
			const th = document.createElement("th");
			th.textContent = title;
			tr.append(th);
		}
		return tr;
	};

	const createTable = async (site) => {
		// erase existing table data
		monsoonStatsPor.innerHTML = "";
		precipTop10.innerHTML = "";
		precipTable.innerHTML = "Loading...";
		const data = await getData(site);
		// clear loading, then create and append table
		precipTable.innerHTML = "";
		const table = document.createElement("table");
		precipTable.append(table);
		// process data and add to tables
		processData(data, site);
		// append header to table
		table.prepend(makeTableHeader());
		// displays the period of record for the site
		popPor(site);
	};

	return { createTable };
})();

// chart for current year precip from old monsoon rainfall page /////////////////////
const barChart = document.getElementById("barChart").getContext("2d");
const lineChart = document.getElementById("lineChart").getContext("2d");
const siteSelector = document.getElementById("siteSelector");
const lastUpdate = document.getElementById("lastUpdate");
const selectSitePrecip = document.querySelector("#selectSitePrecip");

const precipColor1 = "#537791";
const precipColor2 = "#c1c0b9";

// module pattern that manages precip chart data
const getPrecipData = (() => {
	let sites = [];
	let dates = [];
	let actualPrecipTotal = [];
	let normalPrecipTotal = [];
	let fullPrecipData = [];

	const setDates = () => {
		// fill all monsoon dates into array
		dates = [];
		// year doesn't matter in this case
		let tempDate = new Date("2020-06-15");
		for (let i = 0; i < 108; i++) {
			dates.push(tempDate.toISOString().slice(5, 10));
			tempDate.setDate(tempDate.getDate() + 1);
		}
		const year = Number(precipYear.value);
		// check if it is the current year and if it is, remove items from array
		const isCurrentYear = year === new Date().getFullYear() ? true : false;
		// remove array items if current year and during monsoon
		if (isCurrentYear) {
			const endingDate = new Date();
			// change hours so that it updates at 12z each morning
			endingDate.setHours(endingDate.getHours() - 12);
			for (let [i, date] of dates.entries()) {
				if (date === endingDate.toISOString().slice(5, 10)) {
					dates = dates.slice(0, i);
					break;
				}
			}
		}
	};

	const fetchNew = async (region) => {
		sites = [];
		actualPrecipTotal = [];
		normalPrecipTotal = [];
		fullPrecipData = [];
		// set the dates, will adjust based on time of year and if
		// the season has started yet
		setDates();
		const precipData = await fetchXmacisPrecip(precipRegion.value);
		fullPrecipData = precipData;
		// fill sites
		for (let site of avgDewpoints.regionalSitesList[region]) {
			sites.push(site.name);
		}
		// fill arrays
		for (let site of precipData) {
			actualPrecipTotal.push(site.smry[0]);
			normalPrecipTotal.push(site.smry[1]);
		}
		build();
	};

	const getSites = () => {
		return sites;
	};
	const getDates = () => {
		return dates;
	};
	const getactualPrecipTotal = () => {
		return sites;
	};
	const getnormalPrecipTotal = () => {
		return sites;
	};
	const getFullPrecipData = () => {
		return fullPrecipData;
	};

	const build = () => {
		updateTotalPrecipData(sites, actualPrecipTotal, normalPrecipTotal);
		changeDailyPrecipData(0);
		getLastUpdate();
	};
	return {
		setDates,
		getDates,
		getFullPrecipData,
		fetchNew,
		getSites,
		getactualPrecipTotal,
		getnormalPrecipTotal,
	};
})();

// build daily precip data for line chart
const dailyPrecip = (site, precipType) => {
	const fullPrecipArray = getPrecipData.getFullPrecipData();
	const newPrecipArray = [];
	let newPrecipTotal = 0;
	// check if precipType is normalPrecip
	if (precipType === "normalPrecip") {
		for (let index in getPrecipData.getDates()) {
			const currentPrecipAmount = fullPrecipArray[site].data[index][1];
			if (currentPrecipAmount !== "T" && currentPrecipAmount !== "M") {
				newPrecipTotal = Number((newPrecipTotal + Number(currentPrecipAmount)).toFixed(2));
			}
			newPrecipArray.push(newPrecipTotal);
		}
	} else {
		for (let i = 0; i < getPrecipData.getDates().length; i++) {
			const currentPrecipAmount = fullPrecipArray[site].data[i][0];
			if (
				currentPrecipAmount !== "T" &&
				currentPrecipAmount !== "M" &&
				currentPrecipAmount !== "S"
			) {
				// have to slice because values sometimes attach "A" ie "0.20A"
				const tempPrecipAmount = currentPrecipAmount.slice(0, 4);
				newPrecipTotal = Number((newPrecipTotal + Number(tempPrecipAmount)).toFixed(2));
			}
			newPrecipArray.push(newPrecipTotal);
		}
	}
	return newPrecipArray;
};

// site selector for precip data
selectSitePrecip.addEventListener("change", (e) => changeDailyPrecipData(e.target.value));
function changeDailyPrecipData(site) {
	// update chart labels and data
	buildLineChart.data.labels = getPrecipData.getDates();
	buildLineChart.data.datasets[0].data = dailyPrecip(site, "actualPrecip");
	buildLineChart.data.datasets[1].data = dailyPrecip(site, "normalPrecip");
	buildLineChart.options.plugins.title.text = `Monsoon Rainfall for ${
		selectSitePrecip.options[selectSitePrecip.selectedIndex].text
	}`;
	buildLineChart.update();
}

function updateTotalPrecipData(sites, actual, normal) {
	// update chart labels and data
	buildBarChart.data.labels = sites;
	buildBarChart.data.datasets[0].data = actual;
	buildBarChart.data.datasets[1].data = normal;
	buildBarChart.options.plugins.title.text = `${precipYear.value} Monsoon Rainfall vs. Normal`;
	buildBarChart.update();
}

// publishes latest update to graphs
function getLastUpdate() {
	const year = precipYear.value;
	const date = getPrecipData.getDates();
	lastUpdate.innerHTML = `Precip Totals Through:<br /><em>${date[date.length - 1]}-${year}</em>`;
}

// uses chart JS to build total precip chart
const buildBarChart = new Chart(barChart, {
	type: "bar",
	data: {
		labels: [],
		datasets: [
			{
				label: "Actual Rainfall",
				backgroundColor: precipColor1,
				borderColor: precipColor1,
				data: [],
			},
			{
				label: "Normal Rainfall (1991-2020)",
				backgroundColor: precipColor2,
				borderColor: precipColor2,
				data: [],
			},
		],
	},
	plugins: [plugin, plugin2],
	// Configuration options go here
	options: {
		maintainAspectRatio: false,
		plugins: {
			title: {
				display: true,
				text: `${precipYear.value} Monsoon Rainfall vs. Normal`,
				font: {
					size: 22,
				},
			},
		},
		scales: {
			yAxes: [
				{
					scaleLabel: {
						display: true,
						labelString: "Rainfall (inches)",
						fontSize: 14,
					},
					// offset: true,
					ticks: {
						precision: 2,
						beginAtZero: true,
					},
				},
			],
		},
	},
});

// Builds line graph for daily rainfall data vs normal
const buildLineChart = new Chart(lineChart, {
	type: "line",
	data: {
		labels: [],
		datasets: [
			{
				label: "Actual Rainfall",
				backgroundColor: precipColor1,
				borderColor: precipColor1,
				data: [],
				fill: false,
				lineTension: 0,
				pointRadius: 0,
			},
			{
				label: "Normal Rainfall",
				backgroundColor: precipColor2,
				borderColor: precipColor2,
				data: [],
				fill: false,
				lineTension: 0,
				pointRadius: 0,
			},
		],
	},
	plugins: [plugin2],
	options: {
		maintainAspectRatio: false,
		plugins: {
			title: {
				display: true,
				text: "",
				font: {
					size: 22,
				},
			},
		},
		interaction: {
			mode: "index",
			intersect: false,
		},
		scales: {
			yAxes: [
				{
					scaleLabel: {
						display: true,
						labelString: "Rainfall (inches)",
						fontSize: 14,
					},
					// offset: true,
					ticks: {
						precision: 2,
						beginAtZero: true,
					},
				},
			],
		},
	},
});

// populates years inside the select element dating back to a start year
function fillYears(selectEl, startYear) {
	let endYear = hasSeasonStarted();
	for (let i = endYear; i >= startYear; i--) {
		const option = document.createElement("option");
		option.value = i;
		option.textContent = i;
		selectEl.append(option);
	}
}

// checkes to see if the monsoon season has started, otherwise show last year
function hasSeasonStarted() {
	const currentDate = new Date();
	let endYear = currentDate.getFullYear();
	if (currentDate < new Date(`June 16, ${endYear}`)) {
		endYear -= 1;
	}
	return endYear;
}

// fetch precip from xmacis based on sites and date range
// will return array of each site's climate data
// inside that is another array with actual and normal precip
async function fetchXmacisPrecip(selectedRegion) {
	const datesArray = getPrecipData.getDates();
	const sitesArray = [];
	for (let site of avgDewpoints.regionalSitesList[selectedRegion]) {
		sitesArray.push(site.site);
	}
	const selectedYear = precipYear.value;
	const urlBase = "https://data.rcc-acis.org/MultiStnData";
	const elements = {
		sids: sitesArray.toString(),
		sdate: `${selectedYear}-${datesArray[0]}`,
		edate: `${selectedYear}-${datesArray[datesArray.length - 1]}`,
		elems: [
			{
				name: "pcpn",
				duration: "dly",
				smry: "sum",
			},
			{
				name: "pcpn",
				duration: "dly",
				smry: "sum",
				normal: "1",
			},
		],
	};
	const response = await fetch(`${urlBase}?params=${JSON.stringify(elements)}`);
	const json = await response.json();
	return json.data;
}

// updates precip bar and line chanrts when changing year
precipYear.addEventListener("change", () => {
	getPrecipData.fetchNew(precipRegion.value);
});

// updates precip bar and line chanrts when changing region
precipRegion.addEventListener("change", () => {
	fillPrecipSites();
	getPrecipData.fetchNew(precipRegion.value);
});

function fillPrecipSites() {
	selectSitePrecip.innerHTML = "";
	for (let [i, site] of avgDewpoints.regionalSitesList[precipRegion.value].entries()) {
		const option = document.createElement("option");
		option.value = i;
		option.textContent = site.name;
		selectSitePrecip.append(option);
	}
}

// populate lightning charts from PSR json file ///////////////////////
const lightningControls = (() => {
	let ltgData = {};

	const makeDates = (isIndex = false, searchDate = "09-30") => {
		// fill all monsoon dates into array
		const dates = [];
		// year doesn't matter in this case
		let tempDate = new Date("2020-06-15");
		for (let i = 0; i < 108; i++) {
			dates.push(tempDate.toISOString().slice(5, 10));
			// if we want to return the index of the date, check to see if loop matches
			if (isIndex) {
				if (tempDate.toISOString().slice(5, 10) === searchDate) {
					return i;
				}
			}
			tempDate.setDate(tempDate.getDate() + 1);
		}
		return dates;
	};

	const buildDatasetInfoLine = (region) => {
		const years = Object.keys(ltgData[region]);
		years.sort().reverse();
		const tempArrayOfDatasets = [];
		for (let [i, year] of years.entries()) {
			const tempObj = {};
			tempObj.label = year;
			// bold if avg line
			if (year === "AVG") {
				tempObj.backgroundColor = "#333";
				tempObj.borderColor = "#333";
				tempObj.borderWidth = 4;
				tempObj.pointRadius = 0;
				tempObj.pointHoverRadius = 0;
				tempObj.order = 1;
				tempObj.data = ltgData[region][year];
			} else if (i === 1) {
				// if most recent year, highlight in bold blue
				tempObj.order = 0;
				tempObj.backgroundColor = "#3ae";
				tempObj.borderColor = "#3ae";
				tempObj.borderWidth = 4;
				tempObj.hoverBorderWidth = 4;
				// only use up to most recent day and make last point a big dot
				tempObj.data = [];
				tempObj.pointRadius = [];
				tempObj.pointHoverRadius = [];
				// get index for most recent day
				for (let j = 0; j < makeDates(true, ltgData.Update.slice(5, 10)).length; j++) {
					tempObj.data.push(ltgData[region][year][j]);
					tempObj.pointRadius.push(0);
					tempObj.pointHoverRadius.push(0);
				}
				// make last point a big dot
				tempObj.pointRadius[tempObj.pointRadius.length - 1] = 5;
				tempObj.pointHoverRadius[tempObj.pointHoverRadius.length - 1] = 5;
				console.log(tempObj);
				// else gray
			} else {
				tempObj.backgroundColor = "#c1c0b9";
				tempObj.borderColor = "#c1c0b9";
				tempObj.pointRadius = 0;
				tempObj.pointHoverRadius = 0;
				tempObj.order = 2;
				tempObj.data = ltgData[region][year];
			}
			tempObj.hoverBackgroundColor = "#d58";
			tempObj.hoverBorderColor = "#d58";
			tempArrayOfDatasets.push(tempObj);
		}
		return tempArrayOfDatasets;
	};

	const buildDatasetInfoBar = (region) => {
		const years = Object.keys(ltgData[region]);
		years.sort();
		let currentDate = new Date();
		// prevent day from advancing until 5am
		if (currentDate.getUTCHours() < 12) {
			currentDate.setUTCDate(currentDate.getUTCDate() - 1);
		}
		const avgToDate = [];
		const avgSeasonTotal = [];
		const toDate = [];
		const seasonTotal = [];
		const finalYears = [];
		// set date index by getting length of date array. If before season start, set index to 0
		let dateIndex = makeDates(true, currentDate.toISOString().slice(5, 10)).length - 1;
		if (dateIndex === -1) {
			dateIndex = 0;
		}
		for (let year of years) {
			if (year === "AVG") {
				continue;
			} else {
				avgToDate.push(ltgData[region]["AVG"][dateIndex]);
				avgSeasonTotal.push(ltgData[region]["AVG"][107]);
				toDate.push(ltgData[region][year][dateIndex]);
				seasonTotal.push(ltgData[region][year][107]);
				finalYears.push(year);
			}
		}
		console.log(seasonTotal);
		return {
			avgToDate,
			avgSeasonTotal,
			toDate,
			seasonTotal,
			finalYears,
		};
	};

	// create option groups for each region, sort and append options to each
	const populateLightningRegion = (data) => {
		const optGroupState = document.createElement("optgroup");
		optGroupState.label = "State";
		const optGroupMetro = document.createElement("optgroup");
		optGroupMetro.label = "City/Metro";
		const optGroupCounty = document.createElement("optgroup");
		optGroupCounty.label = "County";
		const regions = Object.keys(data).sort();
		for (let region of regions) {
			if (region !== "Update") {
				const option = document.createElement("option");
				option.value = region;
				// check to see if region exists in the config file, if not, then add name
				// as the default region name and will be put in counties list
				if (avgDewpoints.lightningSitesList[region].name) {
					option.innerText = avgDewpoints.lightningSitesList[region].name;
				} else {
					option.innerText = avgDewpoints.lightningSitesList[region];
				}
				// now append to option group
				if (region === "AZ") {
					optGroupState.append(option);
				} else if (region === "Phoenix" || region === "Tucson" || region === "Flagstaff") {
					optGroupMetro.append(option);
				} else {
					optGroupCounty.append(option);
				}
			}
		}
		lightningRegionSelect.append(optGroupState, optGroupMetro, optGroupCounty);
	};

	const updateChart = (region) => {
		lightningLine.data.labels = makeDates();
		lightningLine.data.datasets = buildDatasetInfoLine(region);
		lightningLine.options.plugins.title.text = `${avgDewpoints.lightningSitesList[region].name} - Total Lightning Strikes`;
		lightningLine.update();
		// get obj of data for bar chart, toDate, seasonTotal
		const barDataObj = buildDatasetInfoBar(region);
		lightningBar.data.datasets[0].data = barDataObj.toDate;
		lightningBar.data.datasets[1].data = barDataObj.seasonTotal;
		lightningBar.data.datasets[2].data = barDataObj.avgToDate;
		lightningBar.data.datasets[3].data = barDataObj.avgSeasonTotal;
		lightningBar.data.labels = barDataObj.finalYears;
		lightningBar.options.plugins.title.text = `${avgDewpoints.lightningSitesList[region].name} - Lightning Strikes to Date/Total`;
		lightningBar.update();
	};

	const latestUpdate = () => {
		const updateTime = new Date(ltgData.Update.slice(0, 10));
		updateTime.setUTCDate(updateTime.getUTCDate() - 1);
		console.log(updateTime.toISOString());
		const dateString = new Intl.DateTimeFormat("en-US", {
			month: "2-digit",
			day: "2-digit",
			year: "numeric",
			timeZone: "UTC",
		}).format(updateTime);
		lastLightningUpdate.innerHTML = `Last Updated:<br><em>${dateString} 5pm</em>`;
	};

	// initialize the lightning chart, download data, set up regions and draw chart
	const init = async () => {
		const response = await fetch(
			"https://www.weather.gov/source/psr/LightningTracker/NLDN/ltg.json",
			{
				credentials: "include",
			}
		);
		// have to use local file for development because of CORS
		// const response = await fetch("./monsoon/ltg3.json");
		const json = await response.json();
		ltgData = json;
		populateLightningRegion(json);
		updateChart("AZ");
		latestUpdate();
	};

	return { init, updateChart };
})();

lightningRegionSelect.addEventListener("change", (e) => {
	lightningControls.updateChart(e.target.value);
});

lightningRegionsLink.addEventListener("click", () => {
	lightningRegionsImage.classList.toggle("d-none");
});

const lightningLine = new Chart(lightningLineChart, {
	type: "line",
	data: {
		labels: [],
		datasets: [],
	},
	plugins: [plugin, plugin2],
	options: {
		interaction: {
			mode: "nearest",
			intersect: false,
		},
		hover: {
			mode: "dataset",
		},
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				labels: {
					// only show labels for average, current year and all other years
					filter: (item, ctx) => {
						if (item.datasetIndex === 0) {
							item.text = "Average";
							return item;
						} else if (item.datasetIndex === 1) {
							item.text = "Current Year";
							return item;
						} else if (item.datasetIndex === 2) {
							item.text = "Other Years";
							return item;
						}
					},
				},
			},
			zoom: {
				pan: {
					enabled: true,
					mode: "x",
					modifierKey: "alt",
				},
				limits: {
					x: {
						minRange: 10,
					},
				},
				zoom: {
					mode: "x",
					drag: {
						enabled: true,
					},
					wheel: {
						enabled: true,
						modifierKey: "ctrl",
					},
				},
			},
			title: {
				display: true,
				text: `AZ Lightning Strikes`,
				font: {
					size: 22,
				},
			},
		},
		// scales: {
		//   yAxes: [
		//     {
		//       scaleLabel: {
		//         display: true,
		//         labelString: "Number of Strikes",
		//         fontSize: 14
		//       },
		//       // offset: true,
		//       ticks: {
		//         precision: 2,
		//         beginAtZero: true
		//       }
		//     }
		//   ]
		// }
	},
});

const lightningBar = new Chart(lightningBarChart, {
	type: "bar",
	data: {
		labels: [],
		datasets: [
			{
				type: "bar",
				label: "To Date",
				backgroundColor: "#3ae",
				borderColor: "#3ae",
				data: [],
				order: 3,
			},
			{
				type: "bar",
				label: "Season Total",
				barPercentage: 0.5,
				backgroundColor: "#c1c0b9",
				borderColor: "#c1c0b9",
				data: [],
				order: 3,
			},
			{
				type: "line",
				label: "To Date Avg",
				data: [],
				backgroundColor: "rgba(255, 255, 255, 0.0)",
				borderColor: "#3ae",
				order: 1,
				pointRadius: 0,
				borderWidth: 2,
				borderDash: [4, 5],
			},
			{
				type: "line",
				label: "Season Total Avg",
				data: [],
				backgroundColor: "rgba(255, 255, 255, 0.0)",
				borderColor: "#c1c0b9",
				order: 1,
				pointRadius: 0,
				borderWidth: 2,
				borderDash: [4, 5],
			},
		],
	},
	plugins: [plugin, plugin2],
	options: {
		maintainAspectRatio: false,
		scales: {
			x: {
				stacked: true,
			},
		},
		plugins: {
			// legend: {
			// 	display: false,
			// },
			zoom: {
				pan: {
					enabled: true,
					mode: "x",
					modifierKey: "alt",
				},
				limits: {
					x: {
						minRange: 10,
					},
				},
				zoom: {
					mode: "x",
					drag: {
						enabled: true,
					},
					wheel: {
						enabled: true,
						modifierKey: "ctrl",
					},
				},
			},
			title: {
				display: true,
				text: `Lightning Strikes`,
				font: {
					size: 22,
				},
			},
		},
	},
});
