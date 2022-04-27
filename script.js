// e56e04d76bad41229d6c0f7076d54d59
// Things to update at start of year:
// Top 10 records for wettest/driest - avg-dewpoints.json
// Add previous year's monthly rainfall and total - avg-dewpoints.json (add to end of array)

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
const precipMaps = document.querySelector("#precipMaps");
const precipMapsBtn = document.querySelector("#precipMapsBtn");
const dewpointYear = document.querySelector("#dewpointYear");
const precipYear = document.querySelector("#precipYear");
const precipRegion = document.querySelector("#precipRegion");

let avgDewpoints = {};
fetch("./json/avg-dewpoints.json")
	.then((res) => res.json())
	.then((data) => (avgDewpoints = data));

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
		popTop10("ktus");
		popTable("ktus");
		popPor("ktus");
	}
}

// select element that switches between the different PDFs
monsoonEdSelect.addEventListener("change", (e) => {
	monsoonEdPDF.src = `./pdfs/${e.target.value}.pdf`;
});

// attempt at custom image background
const bgImage = new Image();
bgImage.src = "./img/150px-NOAA-Logo.png";
const bgImage2 = new Image();
bgImage2.src = "./img/150px-NWS-Logo.png";

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

// instantiate chart
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
	plugins: [plugin],
	options: {
		maintainAspectRatio: false,
		plugins: {
			title: {
				display: true,
				text: `${selectSite.options[selectSite.selectedIndex].text} - Avg Daily Dewpoint Tracker`,
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
		`https://api.synopticdata.com/v2/stations/timeseries?stid=${selectSite.value}&start=${selectedYear}06150600&end=${selectedYear}10010700&units=english&hfmetars=0&vars=dew_point_temperature&obtimezone=local&token=e56e04d76bad41229d6c0f7076d54d59`
	)
		.then((res) => res.json())
		.then((data) => {
			// console.log(data);
			// console.log(data.STATION[0].OBSERVATIONS.date_time);
			const dates = data.STATION[0].OBSERVATIONS.date_time;
			const values = data.STATION[0].OBSERVATIONS.dew_point_temperature_set_1;
			calcDailyAvg(dates, values);
		});
}

function calcDailyAvg(datesArr, valuesArr) {
	let finalDatesArr = [];
	let finalValuesArr = [];
	let currentDate = datesArr[0].substring(0, 10);
	let currentValuesArr = [];
	for (const [i, date] of datesArr.entries()) {
		// if date matches current date, add value to array
		if (date.substring(0, 10) === currentDate) {
			currentValuesArr.push(valuesArr[i]);
		} else {
			// calculate avg
			const sum = currentValuesArr.reduce((a, b) => a + b, 0);
			const avg = +(sum / currentValuesArr.length).toFixed(1);
			// set final values
			finalDatesArr.push(date.substring(0, 10));
			finalValuesArr.push(avg);
			// reset values and establish new day
			currentDate = date.substring(0, 10);
			currentValuesArr = [];
			currentValuesArr.push(valuesArr[i]);
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
	popTop10(e.target.value);
	popTable(e.target.value);
	popPor(e.target.value);
});

// populates text and por for selected site
function popPor(site) {
	monsoonStatsPor.innerHTML = `<b>Monsoon Statitics for ${
		monsoonStatsSite.options[monsoonStatsSite.selectedIndex].text
	} (${avgDewpoints[site].top10.por})</b>`;
}

// poplate top 10 wettest and driest table
function popTop10(site) {
	// clear table
	precipTop10.innerHTML = "";
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
	for (let i = 0; i < 5; i++) {
		const tr = document.createElement("tr");
		for (let j = 0; j < 4; j++) {
			const td = document.createElement("td");
			let temp;
			switch (j) {
				case 0:
					temp =
						typeof avgDewpoints[site].top10.wettest.amount[i] === "number"
							? avgDewpoints[site].top10.wettest.amount[i].toFixed(2)
							: avgDewpoints[site].top10.wettest.amount[i];
					td.textContent = `${i + 1}) ${temp}" / ${avgDewpoints[site].top10.wettest.year[i]}`;
					break;
				case 1:
					temp =
						typeof avgDewpoints[site].top10.wettest.amount[i + 5] === "number"
							? avgDewpoints[site].top10.wettest.amount[i + 5].toFixed(2)
							: avgDewpoints[site].top10.wettest.amount[i + 5];
					td.textContent = `${i + 6}) ${temp}" / ${avgDewpoints[site].top10.wettest.year[i + 5]}`;
					break;
				case 2:
					temp =
						typeof avgDewpoints[site].top10.driest.amount[i] === "number"
							? avgDewpoints[site].top10.driest.amount[i].toFixed(2)
							: avgDewpoints[site].top10.driest.amount[i];
					td.textContent = `${i + 1}) ${temp}" / ${avgDewpoints[site].top10.driest.year[i]}`;
					break;
				case 3:
					temp =
						typeof avgDewpoints[site].top10.driest.amount[i + 5] === "number"
							? avgDewpoints[site].top10.driest.amount[i + 5].toFixed(2)
							: avgDewpoints[site].top10.driest.amount[i + 5];
					td.textContent = `${i + 6}) ${temp}" / ${avgDewpoints[site].top10.driest.year[i + 5]}`;
					break;
				default:
					console.log("whoops");
			}
			tr.append(td);
		}
		precipTop10.append(tr);
	}
}

// populate table with historical precip data
async function popTable(site) {
	precipTable.innerHTML = "Loading...";
	const table = document.createElement("table");
	// show haywood plot and link?
	if (site === "ktus") {
		haywoodLink.classList.remove("d-none");
		haywoodPlot.classList.remove("d-none");
	} else {
		haywoodLink.classList.add("d-none");
		haywoodPlot.classList.add("d-none");
	}
	// loops through precip data
	for (let [i, cell] of avgDewpoints[site].precip.entries()) {
		// make new table row if necessary
		if (i % 6 === 0 || i === 0) {
			const tr = document.createElement("tr");
			table.prepend(tr);
			const td = document.createElement("td");
			td.textContent = `${cell}`;
			tr.append(td);
		} else {
			const tr = table.firstChild;
			const td = document.createElement("td");
			// if number, add inches symbol, else just print T
			if (typeof cell === "number") {
				td.textContent = `${cell.toFixed(2)}"`;
			} else {
				td.textContent = `${cell}`;
			}
			tr.append(td);
		}
	}
	// add current year data
	const currentYrData = await processXmacis(site);
	const currentYrTr = document.createElement("tr");
	const currentYr = document.createElement("td");
	currentYr.textContent = new Date().getFullYear();
	currentYrTr.append(currentYr);
	// loop through and add data from xmacis
	for (let currentData of currentYrData) {
		const td = document.createElement("td");
		td.textContent = `${currentData[1]}"`;
		currentYrTr.append(td);
	}
	table.prepend(currentYrTr);
	// add header
	const labels = ["Year", "June (15-30)", "July", "August", "September", "Total"];
	const headerRow = document.createElement("tr");
	for (let label of labels) {
		const th = document.createElement("th");
		th.textContent = label;
		headerRow.append(th);
	}
	table.prepend(headerRow);
	precipTable.innerHTML = "";
	precipTable.append(table);
}

// make url for retrieving climate precip data
async function getXmacisData(site, monthly) {
	const currentYear = new Date().getFullYear();
	const dates = [];
	const elems = [
		{
			name: "pcpn",
		},
	];
	// check if need monthly or daily summed data
	if (monthly) {
		dates.push(`${currentYear}-06`);
		dates.push(`${currentYear}-09`);
		elems[0].interval = "mly";
		elems[0].duration = "mly";
		elems[0].reduce = {
			reduce: "sum",
		};
	} else {
		dates.push(`${currentYear}-06-01`);
		dates.push(`${currentYear}-06-14`);
		elems[0].interval = [0, 0, 1];
		elems[0].duration = 1;
		elems[0].smry = "sum";
		elems[0].smry_only = "1";
	}
	const url = "https://data.rcc-acis.org/StnData";
	const params = {
		sid: site,
		sdate: dates[0],
		edate: dates[1],
		elems: elems,
	};
	const finalUrl = url + "?params=" + JSON.stringify(params);
	const res = await fetch(finalUrl);
	const data = await res.json();
	// if monthly, will return array of months, which is also array of data and precip total
	// ['2022-06', '0.00']
	// otherwise return sum of dates 6-01 to 6-14
	if (monthly) {
		for (let value of data.data) {
			// replace "M" or "T" with 0.00
			if (value[1] === "M" || value[1] === "T") {
				console.log(value[1]);
				value[1] = "0.00";
			}
		}
		return data.data;
	}
	// "smry": ["0.00"]
	else {
		// replace "M" or "T" with 0.00
		if (data.smry[0] === "M" || value[1] === "T") {
			data.smry[0] = "0.00";
		}
		return data.smry;
	}
}

async function processXmacis(site) {
	const monthlyData = getXmacisData(site, true);
	const dailyData = getXmacisData(site, false);
	const promiseValues = await Promise.all([monthlyData, dailyData]);
	// take monthly data and create a final array of values
	const finalValues = [...promiseValues[0]];
	// subtract value of
	finalValues[0][1] = (Number(finalValues[0][1]) - Number(promiseValues[1][0])).toFixed(2);
	// add total
	const totalPrecip = finalValues.reduce(
		(partialSum, currentVal) => partialSum + Number(currentVal[1]),
		0
	);
	finalValues.push(["Total", totalPrecip.toFixed(2)]);
	return finalValues;
}

// chart for current year precip from old monsoon rainfall page /////////////////////
const barChart = document.getElementById("barChart").getContext("2d");
const lineChart = document.getElementById("lineChart").getContext("2d");
const siteSelector = document.getElementById("siteSelector");
const lastUpdate = document.getElementById("lastUpdate");
const selectSitePrecip = document.querySelector("#selectSitePrecip");

const precipColor1 = "#537791";
const precipColor2 = "#c1c0b9";

let precipData = {};
let normalData = [];
let sites = [];
let actualPrecip = [];
let normalPrecip = [];

// const currentYear = new Date().getFullYear();
const currentYear = "2021";

getPrecipData();

// "https://extendsclass.com/api/json-storage/bin/addceda"
// "../../images/twc/monsoonPCP/2020PCP.json"

// Gets JSON data via Axios and populates precip variables, then builds chart
async function getPrecipData() {
	// const fetchNormals = await fetch("../../images/twc/monsoonPCP/1991-2020normals.json");
	const fetchNormals = await fetch("./json/1991-2020normals.json");
	normalData = await fetchNormals.json();
	// const fetchData = await fetch(`../../images/twc/monsoonPCP/${currentYear}PCP.json`);
	const fetchData = await fetch("./json/2021PCP.json");
	precipData = await fetchData.json();
	console.log(precipData);
	fillPrecipData();
	buildChart();
	changeDailyPrecipData(0);
	getLastUpdate();
}

// fill arrays with stuff
const fillPrecipData = () => {
	sites = buildSites(precipData.data);
	actualPrecip = buildPrecip(precipData.data, "actualPrecip");
	normalPrecip = buildPrecip(normalData, "normalPrecip");
	//normalPrecip = buildNormals(normalData);
};

// Builds the list of sites as an array
const buildSites = (precipData) => {
	const sites = [];
	for (let site of precipData) {
		sites.push(site.name);
	}
	return sites;
};

// Builds both the actual and normal precip arrays
const buildPrecip = (data, precipType) => {
	const precipArray = [];
	// if precipType is "normalPrecip", only load to the current date
	if (precipType === "normalPrecip") {
		for (let site of data) {
			let totalPrecipAmount = 0;
			// get number of days in dataset
			for (let index in precipData.date) {
				if (typeof site[precipType][index] === "number") {
					totalPrecipAmount += site[precipType][index];
				}
			}
			precipArray.push(Number(totalPrecipAmount.toFixed(2)));
		}
	} else {
		for (let site of data) {
			let totalPrecipAmount = 0;
			for (let precip of site[precipType]) {
				if (typeof precip === "number") {
					totalPrecipAmount += precip;
				}
			}
			precipArray.push(Number(totalPrecipAmount.toFixed(2)));
		}
	}
	return precipArray;
};

// build daily precip data for line chart
const dailyPrecip = (site, precipType) => {
	const newPrecipArray = [];
	let newPrecipTotal = 0;
	// check if precipType is normalPrecip
	if (precipType === "normalPrecip") {
		for (let index in precipData.date) {
			const currentPrecipAmount = normalData[site][precipType][index];
			if (typeof currentPrecipAmount === "number") {
				newPrecipTotal += currentPrecipAmount;
				newPrecipArray.push(newPrecipTotal);
			} else {
				newPrecipArray.push(newPrecipTotal);
			}
		}
	} else {
		for (let i = 0; i < precipData.data[site][precipType].length; i++) {
			const currentPrecipAmount = precipData.data[site][precipType][i];
			if (typeof currentPrecipAmount === "number") {
				newPrecipTotal += currentPrecipAmount;
				newPrecipArray.push(newPrecipTotal);
			} else {
				newPrecipArray.push(newPrecipTotal);
			}
		}
	}
	return newPrecipArray;
};

// site selector for precip data
selectSitePrecip.addEventListener("change", (e) => changeDailyPrecipData(e.target.value));
function changeDailyPrecipData(site) {
	// update chart labels and data
	buildLineChart.data.labels = precipData.date;
	buildLineChart.data.datasets[0].data = dailyPrecip(site, "actualPrecip");
	// console.log(dailyPrecip(site, "actualPrecip"));
	buildLineChart.data.datasets[1].data = dailyPrecip(site, "normalPrecip");
	buildLineChart.options.plugins.title.text = `Monsoon Rainfall for ${
		selectSitePrecip.options[selectSitePrecip.selectedIndex].text
	}`;
	buildLineChart.update();
}

// publishes latest update to graphs
function getLastUpdate() {
	lastUpdate.innerHTML = "*** Will Begin After June 15th ***";
	if (precipData.date.length !== 0) {
		lastUpdate.innerHTML = `Last Update:<br /><em><b>${
			precipData.date[precipData.date.length - 1]
		}/${currentYear}</em></b>`;
	}
}

// uses chart JS to build total precip chart
const buildChart = () => {
	const chart = new Chart(barChart, {
		type: "bar",
		data: {
			labels: sites,
			datasets: [
				{
					label: "Actual Rainfall",
					backgroundColor: precipColor1,
					borderColor: precipColor1,
					data: actualPrecip,
				},
				{
					label: "Normal Rainfall",
					backgroundColor: precipColor2,
					borderColor: precipColor2,
					data: normalPrecip,
				},
			],
		},

		// Configuration options go here
		options: {
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: `${currentYear} Monsoon Rainfall vs. Normal`,
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
};

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

	// Configuration options go here
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
async function fetchXmacisPrecip(sites) {
	const urlBase = "https://data.rcc-acis.org/MultiStnData";
	const elements = {
		sids: "KTUS,KOLS,KSAD,SEVA3",
		sdate: "2020-06-15",
		edate: "2020-06-30",
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
	console.log(json);
}
