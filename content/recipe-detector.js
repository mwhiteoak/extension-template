// Homebrew Recipe Sidekick — Recipe Field Detector
// Runs first, detects recipe data from page DOM, exposes as window.HBS_RECIPE_DATA

(function () {
  'use strict';

  const site = location.hostname.replace(/^www\./, '');

  const data = {
    og: null,       // original gravity, e.g. 1.055
    fg: null,       // final gravity
    batchSizeGal: null,
    hops: [],       // [{ name, weightOz, alphaAcid, boilTimeMin }]
    grains: [],     // [{ name, weightLbs, lovibond }]
    yeast: null,    // { name, attenuationLow, attenuationHigh }
  };

  if (site === 'brewersfriend.com') {
    detectBrewersFriend(data);
  } else if (site === 'homebrewtalk.com') {
    detectHomebrewTalk(data);
  }

  window.HBS_RECIPE_DATA = data;

  function parseNum(str) {
    if (!str) return null;
    const n = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }

  function detectBrewersFriend(d) {
    // Batch size — look for "Batch Size" label pairs
    const allText = document.querySelectorAll('td, th, .stat-label, .recipe-stat');
    allText.forEach(el => {
      const txt = el.textContent.trim().toLowerCase();
      const next = el.nextElementSibling;
      if (!next) return;
      if (txt.includes('batch size')) {
        const val = parseNum(next.textContent);
        if (val) {
          // Detect unit — if "L" present convert to gal
          const unit = next.textContent.toLowerCase();
          d.batchSizeGal = unit.includes('l') && !unit.includes('gal') ? val / 3.785 : val;
        }
      }
      if (txt.includes('original gravity') || txt === 'og') {
        d.og = parseNum(next.textContent);
      }
      if (txt.includes('final gravity') || txt === 'fg') {
        d.fg = parseNum(next.textContent);
      }
    });

    // OG/FG from stat blocks
    document.querySelectorAll('.recipe-stat-block, .recipe-stats, .stat-block').forEach(block => {
      const label = block.querySelector('.stat-label, label, th');
      const value = block.querySelector('.stat-value, td, .value');
      if (!label || !value) return;
      const lbl = label.textContent.trim().toLowerCase();
      const val = parseNum(value.textContent);
      if (!val) return;
      if (lbl.includes('og') || lbl.includes('original')) d.og = val;
      if (lbl.includes('fg') || lbl.includes('final')) d.fg = val;
      if (lbl.includes('batch')) {
        const unit = value.textContent.toLowerCase();
        d.batchSizeGal = unit.includes('l') ? val / 3.785 : val;
      }
    });

    // Hops table on BrewersFriend recipe pages
    const hopsTables = document.querySelectorAll('table');
    hopsTables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim().toLowerCase());
      const hasHopCols = headers.some(h => h.includes('hop') || h.includes('alpha') || h === 'aa');
      if (!hasHopCols) return;
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('hop'));
      const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('weight') || h.includes('oz') || h.includes('g'));
      const aaIdx = headers.findIndex(h => h.includes('alpha') || h === 'aa' || h.includes('aa%'));
      const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('min'));
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return;
        const name = nameIdx >= 0 ? cells[nameIdx]?.textContent.trim() : null;
        const rawAmt = amtIdx >= 0 ? cells[amtIdx]?.textContent.trim() : null;
        const rawAA = aaIdx >= 0 ? cells[aaIdx]?.textContent.trim() : null;
        const rawTime = timeIdx >= 0 ? cells[timeIdx]?.textContent.trim() : null;
        if (!name) return;
        let weightOz = parseNum(rawAmt);
        if (rawAmt && rawAmt.toLowerCase().includes('g') && !rawAmt.toLowerCase().includes('oz')) {
          weightOz = weightOz ? weightOz / 28.35 : null;
        }
        d.hops.push({
          name,
          weightOz,
          alphaAcid: parseNum(rawAA),
          boilTimeMin: parseNum(rawTime),
        });
      });
    });

    // Grains table
    hopsTables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim().toLowerCase());
      const hasGrainCols = headers.some(h => h.includes('grain') || h.includes('malt') || h.includes('lovibond') || h.includes('srm'));
      if (!hasGrainCols) return;
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('grain') || h.includes('malt'));
      const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('weight') || h.includes('lb') || h.includes('kg'));
      const lovIdx = headers.findIndex(h => h.includes('lovibond') || h.includes('°l') || h.includes('srm'));
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return;
        const name = nameIdx >= 0 ? cells[nameIdx]?.textContent.trim() : null;
        const rawAmt = amtIdx >= 0 ? cells[amtIdx]?.textContent.trim() : null;
        const rawLov = lovIdx >= 0 ? cells[lovIdx]?.textContent.trim() : null;
        if (!name) return;
        let weightLbs = parseNum(rawAmt);
        if (rawAmt && rawAmt.toLowerCase().includes('kg')) {
          weightLbs = weightLbs ? weightLbs * 2.20462 : null;
        }
        d.grains.push({
          name,
          weightLbs,
          lovibond: parseNum(rawLov),
        });
      });
    });

    // Yeast — look for yeast name and attenuation in page text
    document.querySelectorAll('table tbody tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 1) return;
      const rowText = row.textContent.toLowerCase();
      if (!rowText.includes('yeast') && !rowText.includes('attenuation')) return;
      const attenMatch = row.textContent.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*%/);
      if (attenMatch) {
        d.yeast = {
          name: cells[0]?.textContent.trim() || 'Unknown Yeast',
          attenuationLow: parseInt(attenMatch[1], 10),
          attenuationHigh: parseInt(attenMatch[2], 10),
        };
      }
    });
  }

  function detectHomebrewTalk(d) {
    // HomebrewTalk uses forum posts — structured data is rare
    // Try to detect from post text using patterns
    const postContent = document.querySelector('.message-body, .bbWrapper, .messageText');
    if (!postContent) return;
    const text = postContent.textContent;

    // OG: "OG: 1.055" or "Original Gravity: 1.065"
    const ogMatch = text.match(/(?:OG|Original Gravity)[:\s]+([0-9]\.[0-9]{2,4})/i);
    if (ogMatch) d.og = parseFloat(ogMatch[1]);

    const fgMatch = text.match(/(?:FG|Final Gravity)[:\s]+([0-9]\.[0-9]{2,4})/i);
    if (fgMatch) d.fg = parseFloat(fgMatch[1]);

    const batchMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:gallon|gal)(?:s?)\s*batch/i);
    if (batchMatch) d.batchSizeGal = parseFloat(batchMatch[1]);
  }
})();
