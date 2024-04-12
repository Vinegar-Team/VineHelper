var currentTab = "vvp-items-grid";

class Grid {
	constructor(obj) {
		this.pGrid = null;
		this.pArrTile = [];
		this.pGrid = obj;
	}

	getId() {
		return $(this.pGrid).attr("id");
	}

	getDOM() {
		return this.pGrid;
	}

	addTile(t) {
		this.pArrTile.push(t);

		if (Object.keys(t).length !== 0) {
			$(t.getDOM())
				.detach()
				.appendTo("#" + this.getId());
			$(t.getDOM()).show();
		}
	}

	removeTile(t) {
		$.each(
			this.pArrTile,
			function (key, value) {
				if (value != undefined && value.getAsin() == t.getAsin()) {
					this.pArrTile.splice(key, 1);
				}
			}.bind(this)
		);
	}

	async removeTileAnimate(t) {
		this.removeTile(t);

		await t.animateVanish(); //Will hide the tile
	}

	getTileCount(trueCount = false) {
		if (trueCount) return $(this.pGrid).children().length;
		else return this.pArrTile.length;
	}

	getTileId(asin) {
		var r = null;
		$.each(this.pArrTile, function (key, value) {
			if (value != undefined && value.getAsin() == asin) {
				r = value;
				return false; //Stop the loop
			}
		});
		return r;
	}
}

function updateTileCounts() {
	//Calculate how many tiles within each grids
	if (appSettings.unavailableTab.active || appSettings.hiddenTab.active)
		$("#vh-available-count").text(gridRegular.getTileCount(true));

	if (appSettings.unavailableTab.active || appSettings.unavailableTab.votingToolbar)
		$("#vh-unavailable-count").text(gridUnavailable.getTileCount(true));

	if (appSettings.hiddenTab.active) $("#vh-hidden-count").text(gridHidden.getTileCount(true));
}

async function createGridInterface() {
	//Clean up interface (in case of the extension being reloaded)
	let tab0 = document.querySelector("ul#vh-tabs");
	if (tab0) tab0.remove();
	let tab2 = document.querySelector("div#tab-unavailable");
	if (tab2) tab2.remove();
	let tab3 = document.querySelector("div#tab-hidden");
	if (tab3) tab3.remove();
	let tbs = document.querySelectorAll(".vh-status");
	tbs.forEach(function (toolbar) {
		toolbar.remove();
	});

	if (document.getElementById("vvp-items-grid") == undefined) {
		console.log("No listing on this page, not drawing tabs.");
		return false; // No listing on this page
	}

	//Implement the tab system.
	let tabs = document.createElement("div");
	tabs.setAttribute("id", "vh-tabs");
	tabs.classList.add("theme-default");

	let itemsGrid = document.querySelector("#vvp-items-grid");
	itemsGrid.parentNode.insertBefore(tabs, itemsGrid);
	itemsGrid.parentNode.removeChild(itemsGrid);
	itemsGrid.classList.add("tab-grid");
	tabs.appendChild(itemsGrid);

	let tplTabs = await Tpl.loadFile("view/tabs.html");

	Tpl.setIf("not_mobile", true);
	if (appSettings.thorvarium.mobileandroid || appSettings.thorvarium.mobileios) {
		Tpl.setVar("available", "A");
		Tpl.setVar("unavailable", "U");
		Tpl.setVar("hidden", "H");
	} else {
		Tpl.setVar("available", "Available");
		Tpl.setVar("unavailable", "Unavailable");
		Tpl.setVar("hidden", "Hidden");
	}
	//If voting system enabled
	Tpl.setIf("unavailable", appSettings.unavailableTab.active || appSettings.unavailableTab.votingToolbar);

	//If the hidden tab system is activated
	Tpl.setIf("hidden", appSettings.hiddenTab.active);

	let tabsHtml = Tpl.render(tplTabs, false);
	tabs.insertAdjacentHTML("afterbegin", tabsHtml);

	if (appSettings.hiddenTab.active) {
		//Add the toolbar for Hide All & Show All
		//Delete the previous one if any exist:
		let htb = document.querySelector("#vh-tabs .hidden-toolbar");
		if (htb) htb.remove();

		//Generate the html for the hide all and show all widget
		let prom = await Tpl.loadFile("view/widget_hideall.html");
		Tpl.setVar("class", appSettings.thorvarium.darktheme ? "invert" : "");
		let content = Tpl.render(prom, true);
		let clonedContent = content.cloneNode(true);

		// Prepend content to #vh-tabs
		let vtabs = document.querySelector("#vh-tabs");
		vtabs.insertBefore(content, vtabs.firstChild);
		vtabs.appendChild(clonedContent);
		clonedContent.style.marginTop = "5px";

		// Add event listeners to .vh-hideall and .vh-showall elements
		document.querySelectorAll(".vh-hideall").forEach((element) => {
			element.addEventListener("click", () => this.hideAllItems());
		});

		document.querySelectorAll(".vh-showall").forEach((element) => {
			element.addEventListener("click", () => this.showAllItems());
		});
	}

	//Actiate the tab system
	//Bind the click event for the tabs
	document.querySelectorAll("#tabs > ul li").forEach(function (item) {
		item.onclick = function (event) {
			currentTab = this.querySelector("a").href.split("#").pop();
			selectCurrentTab();
			this.classList.add("active");
		};
	});
	//Prevent links from being clickable
	document.querySelectorAll("#tabs > ul li a").forEach(function (item) {
		item.onclick = function (event) {
			event.preventDefault();
		};
	});
	selectCurrentTab(true);
}

async function hideAllItems() {
	let arrTile = [];
	HiddenList.loadFromLocalStorage(); //Refresh the list in case it was altered in a different tab

	//Find out what the current active tab is
	let currentTab = "#vvp-items-grid";
	if (
		document.querySelector("#tab-unavailable") &&
		document.querySelector("#tab-unavailable").style.display !== "none"
	) {
		currentTab = "#tab-unavailable";
	}

	let vvpItemTile = document.querySelector(currentTab + " .vvp-item-tile");
	if (vvpItemTile) {
		while (vvpItemTile && vvpItemTile.children.length > 0) {
			let tDom = vvpItemTile.children[0];
			let asin = getAsinFromDom(tDom);
			arrTile.push({ asin: asin, hidden: true });
			let tile = getTileByAsin(asin); // Obtain the real tile
			await tile.hideTile(false, false); // Do not update local storage

			vvpItemTile = document.querySelector(currentTab + " .vvp-item-tile");
		}
	}
	HiddenList.saveList();

	// Scoll to the RFY/AFA/AI header
	var scrollTarget = document.getElementById("vvp-items-button-container");
	scrollTarget.scrollIntoView({ behavior: "smooth" });
}

async function showAllItems() {
	let arrTile = [];
	HiddenList.loadFromLocalStorage(); //Refresh the list in case it was altered in a different tab

	let vvpItemTile = document.querySelector("#tab-hidden .vvp-item-tile");
	if (vvpItemTile) {
		while (vvpItemTile && vvpItemTile.children.length > 0) {
			let tDom = vvpItemTile.children[0];
			let asin = getAsinFromDom(tDom);
			arrTile.push({ asin: asin, hidden: false });
			let tile = getTileByAsin(asin); //Obtain the real tile
			await tile.showTile(false, false); //Do not update local storage

			vvpItemTile = document.querySelector("#tab-hidden .vvp-item-tile");
		}
	}
	HiddenList.saveList();
}

function selectCurrentTab(firstRun = false) {
	//Hide all tabs
	document.querySelectorAll(".tab-grid").forEach(function (item) {
		item.style.display = "none";
	});

	if (!firstRun) {
		document.querySelectorAll("#tabs > ul li").forEach(function (item) {
			item.classList.remove("active");
		});
	} else {
		document.querySelector("#tabs > ul li:first-child").classList.add("active");
	}

	//Display the current tab
	document.querySelector("#" + currentTab).style.display = "grid";
}
