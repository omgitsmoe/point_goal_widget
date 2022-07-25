let userLocale = "en-US",
    includeFollowers = true,
    includeSubs = true,
    includeTips = true,
    includeCheers = true,
    currentPoints = 0,
    pointsGoal = 0,
    pointsGoalTier2 = 0,
    pointsGoalTier3 = 0,
    currentTier = 1,
    globalMultiplier = 1,
    tier1Multiplier = 1,
    tier2Multiplier = 2,
    tier3Multiplier = 5,
    followerMultiplier = 1,
    subscriberMultiplier = 1,
    cheersPerPoint = 100,
    tipsPerPoint = 3;
    titleTextTier2 = '',
    titleTextTier3 = '';
    pointText = '';

window.addEventListener('onEventReceived', function (obj) {
    if (!obj.detail.event) {
      return;
    }
    if (typeof obj.detail.event.itemId !== "undefined") {
        obj.detail.listener = "redemption-latest"
    }
    const listener = obj.detail.listener.split("-")[0];
    const event = obj.detail.event;
  	parseEvent(listener, event);
});

window.addEventListener('onWidgetLoad', function (obj) {
    let recents = obj.detail.recents;
    recents.sort(function (a, b) {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });
    const fieldData = obj.detail.fieldData;
    eventsLimit = fieldData.eventsLimit;
    includeFollowers = (fieldData.includeFollowers === "yes");
    includeSubs = (fieldData.includeSubs === "yes");
    includeTips = (fieldData.includeTips === "yes");
    includeCheers = (fieldData.includeCheers === "yes");
  	currentPoints = fieldData.currentPoints;
  	pointsGoal = fieldData.pointsGoal;
  	pointsGoalTier2 = fieldData.pointsGoalTier2;
  	pointsGoalTier3 = fieldData.pointsGoalTier3;
  	globalMultiplier = fieldData.globalMultiplier;
  	tier1Multiplier = fieldData.tier1Multiplier;
    tier2Multiplier = fieldData.tier2Multiplier;
    tier3Multiplier = fieldData.tier3Multiplier;
    followerMultiplier = fieldData.followerMultiplier;
    subscriberMultiplier = fieldData.subscriberMultiplier;
    cheersPerPoint = fieldData.cheersPerPoint;
    tipsPerPoint = fieldData.tipsPerPoint;
    titleTextTier2 = fieldData.titleTextTier2;
  	titleTextTier3 = fieldData.titleTextTier3;
    pointText = fieldData.pointText;
    userLocale = fieldData.locale;
    
  	// NOTE: there are a bunch of test events coming in that can't
    // be turned off??
    // let eventIndex;
    // for (eventIndex = 0; eventIndex < recents.length; eventIndex++) {
    //   const event = recents[eventIndex];
    //   parseEvent(event.type, event);
    // }
  
    updateProgressBar();
});

// adapted from: https://github.com/reboot0-de/se-tools/blob/d947ef40e85ac24d09423d91c67d22ef378ad99f/modules/Utils.js#L430
// thanks to thekillgfx for the hint
function parseTier(value, primeAsTier1 = true)
  {
    if(typeof value === "string")
    {
      if(value === "prime") { return (primeAsTier1) ? 1 : "prime"; }
      value = Number(value);
    }
    switch(value)
    {
      case 1000:
      case 1:
        return 1;
      case 2000:
      case 2:
        return 2;
      case 3000:
      case 3:
        return 3;
      default:
        return 1;
    }
  }


function parseEvent(eventType, event) {
  // will use outdated values if defined outside of function
  const tierMultipliers = [tier1Multiplier, tier2Multiplier, tier3Multiplier];

  // console.log('EVENT', eventType, event);
  if (eventType === 'follower') {
    if (includeFollowers) {
      processEvent('follower', 1);
    }
  } else if (eventType === 'subscriber') {
    if (includeSubs) {
      // ignore single gifted subs that are PART OF COMMUNITY GIFTS and
      // use the initial bulkgifted where event.amount is the nr of gifted subs
      // single gifted subs where event.gifted AND !event.isCommunityGift will still count
      if (event.isCommunityGift) return;

      let tierMultiplier = tierMultipliers[parseTier(event.tier, true) - 1];
      // event.amount is the months subbed, not the amount gifted etc.
      // unless it's a bulkGifted event!!
      const amount = event.bulkGifted ? event.amount : 1;
      const tierApplied = amount * tierMultiplier;
      processEvent('subscriber', tierApplied);
    }
  } else if (eventType === 'cheer') {
    if (includeCheers) {
      processEvent('cheer', event.amount);
    }
  } else if (eventType === 'tip') {
    if (includeTips) {
      processEvent('tip', event.amount);
    }
  }
}

function updateFill(fillNode, start, goal) {
  const progressInPercent = (currentPoints - start) / (goal - start) * 100;
  console.log('Progress:', progressInPercent, '%');
  if (progressInPercent >= 100) currentTier += 1;
  fillNode.style.width = `${progressInPercent}%`;
}

function updateProgressBar() {  
  // can't be else ifs since we might finish one tier and go into the next
  // in one contribution
  if (currentTier == 1) {
    console.log('Updating tier1');
    const fill = document.getElementById('progress-fill');
    updateFill(fill, 0, pointsGoal);    
  }
  if (currentTier == 2) {
    console.log('Updating tier2');
    const tier2 = document.getElementById('progress-bar-tier2');
    tier2.style.display = null;
    const title = document.getElementById('title');
    title.textContent = "{titleTextTier2}";
    const width = {tier1Size} + {tier2Size};
    title.style.width = `${width}%`;
    
    const fill = document.getElementById('progress-fill-tier2');
    updateFill(fill, pointsGoal, pointsGoalTier2);
  }
  if (currentTier == 3) {
    console.log('Updating tier3');
    const tier3 = document.getElementById('progress-bar-tier3');
    tier3.style.display = null;
    const title = document.getElementById('title');
    title.textContent = "{titleTextTier3}";
    title.style.width = "100%";
    
    const fill = document.getElementById('progress-fill-tier3');
    updateFill(fill, pointsGoalTier2, pointsGoalTier3);
  }
  
  
    
  const currentText = document.getElementById('progress-current');
  // streamelements placeholder syntax messes with js string templates
  // so ${pointText} will insert the initial value of pointText after $ in a template string
  // even using a different variable name when loading the variable from obj.detail.fieldData won't work
  // use at most 2 decimals places; the + drops any extra zeroes at the end
  const pts = +currentPoints.toFixed(2);
  const txt = pointText;
  currentText.textContent = `${txt}${txt.length > 0 ? ' ' : ''}${pts}`;
}

function processEvent(type, amount) {
  let typeMultiplier = 1;
  if (type === 'follower') {
    typeMultiplier = followerMultiplier;
  } else if (type === 'subscriber') {
    typeMultiplier = subscriberMultiplier;
  } else if (type === 'cheer') {
    typeMultiplier = 1 / cheersPerPoint;
  } else if (type === 'tip') {
    // in units of the preferrec currency: e.g. $3 per point
    typeMultiplier = 1 / tipsPerPoint;
  }
  
  currentPoints += amount * typeMultiplier * globalMultiplier;
  
  updateProgressBar();
}

