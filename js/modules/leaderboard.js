/**
 * Leaderboard Module
 * Handles leaderboard popup and data fetching
 */

const SHEET_URL = 'https://opensheet.elk.sh/169KgT37g1HPVkzH-NLmANR4wAByHtLy03y5bnjQA21o/appdata';

function openLeaderboard() {
  document.getElementById("leaderboardPopup").classList.add("show");
  document.body.style.overflow = "hidden";

  renderTakeoverSponsor();

  const sponsorTabElement = document.querySelector('[onclick*="sponsorTab"]');
  if (sponsorTabElement) showTab('sponsorTab', sponsorTabElement); // Default tab
  fetchSheetData();
}

function closeLeaderboard() {
  document.getElementById("leaderboardPopup").classList.remove("show");
  document.body.style.overflow = "";
}

function showTab(tabId, el) {
  // Hide all tab contents
  document.getElementById('sponsorTab').style.display = 'none';
  document.getElementById('leaderboardTab').style.display = 'none';
  document.getElementById('winnersTab').style.display = 'none';

  // Show selected tab
  document.getElementById(tabId).style.display = 'block';

  // Update active tab UI
  const allTabs = document.querySelectorAll('.leaderboard-tab');
  allTabs.forEach(tab => tab.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function fetchSheetData() {
  try {
    const response = await fetch(SHEET_URL);
    const data = await response.json();

    // Leaderboard data: must have valid points
    const leaderboardData = data
      .filter(entry => entry["First Name"] && !isNaN(parseFloat(entry["Points"])))
      .map(entry => ({
        idCode: entry["ID CODE"] || "",
        name: `${entry["First Name"]} ${entry["Last Name"] || ""}`.trim(),
        points: parseFloat(entry["Points"]) || 0
      }))
      .sort((a, b) => b.points - a.points);

    renderLeaderboard(leaderboardData);

    // Winner data: must have prize
    const winnerData = data
      .filter(entry => entry["First Name"] && entry["Prize"])
      .map(entry => ({
        idCode: entry["ID CODE"] || "",
        name: entry["First Name"] || "",
        prize: entry["Prize"] || "—"
      }));

    renderWinners(winnerData);

  } catch (error) {
    document.getElementById("leaderboardContent").innerHTML = "Failed to load data.";
    document.getElementById("winnersContent").innerHTML = "Failed to load winners.";
    console.error("Error fetching data:", error);
  }
}

function renderLeaderboard(data) {
  const container = document.getElementById("leaderboardContent");
  container.innerHTML = "";

  data.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "leaderboard-row";
    div.innerHTML = `
      <div class="leaderboard-left">
        <div class="leaderboard-idcode">${entry.idCode}</div>
        <div class="leaderboard-name">${index + 1}. ${entry.name}</div>
      </div>
      <div class="leaderboard-points">${entry.points}</div>
    `;
    container.appendChild(div);
  });
}

function renderWinners(data) {
  const container = document.getElementById("winnersContent");
  container.innerHTML = "";

  data.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "leaderboard-row";
    div.innerHTML = `
      <div class="leaderboard-left">
        <div class="leaderboard-idcode">${entry.idCode}</div>
        <div class="leaderboard-name">${index + 1}. ${entry.name}</div>
      </div>
      <div class="leaderboard-points">💰 $${parseInt(entry.prize).toLocaleString()}</div>
    `;
    container.appendChild(div);
  });
}

function renderTakeoverSponsor() {
  const sponsorBox = document.getElementById('sponsorContent');
  if (!sponsorBox) return;

  const selectedBrandName = localStorage.getItem('selectedTakeoverBrand');
  if (!selectedBrandName || !Array.isArray(allBrandsData)) return;

  const brand = allBrandsData.find(b => b.brand === selectedBrandName);
  if (!brand) return;

  sponsorBox.innerHTML = '';

  const brandCard = document.createElement('div');
  brandCard.className = 'popup-brand-box';
  brandCard.innerHTML = `<img src="${brand.logo}" class="leaderboard-logo" alt="${brand.name} logo" />`;

  const heading = document.createElement('div');
  heading.className = 'takeover-heading';
  heading.innerText = `Win a $5,000 Shopping Voucher`;

  const desc = document.createElement('div');
  desc.className = 'takeover-description';
  desc.innerHTML = `<p>To Spend At <strong>${brand.brand}</strong></p>
  <p style="margin-top: 10px;"><strong>🎉 What You Can Win:</strong> 🎁 $5k Shopping Voucher monthly raffle and 🏆 $100k Grand Prize at year-end for top referrer
  </p>

  <p style="text-align: left; font-weight: bold; margin-top: 10px;">📌 How It Works:</p>
  <ul style="text-align: left; padding-left: 20px; margin: 0;">
    <li>📲 Install the app and sign up</li>
    <li>🎟 Get your unique referral code</li>
    <li>👥 Share it with friends via WhatsApp</li>
    <li>🎁 Each signs up = 1 raffle entry</li>
    <li>🚀 The more referrals, higher chance</li>
  </ul>

  <small style="display: block; margin-top: 10px; color: #666;">
    Must be 18+ and a resident of Jamaica. Prizes will be loaded to your <strong>digital shopping card</strong>. Winners are selected monthly. Grand Prize awarded at year-end. Terms subject to change.
  </small>`;

  sponsorBox.appendChild(brandCard);
  sponsorBox.appendChild(heading);
  sponsorBox.appendChild(desc);
}