/**
 * Admin Fetch Module
 * Fetches featured brand, takeover brand, and ranked slot data from Google Sheets
 * These run on page load to configure which brands are featured/takeover/ranked
 */

///////////  Featured Brand Fetch (Sheet1)

fetch('https://opensheet.elk.sh/1_DyGLoYi5ndEkiwhPEzJhMc3vciIFNhN2g-H0gbVRds/sheet1')
  .then(res => res.json())
  .then(data => {
    const last = data[data.length - 1];
    const now = new Date();
    const expiry = new Date(last['Expires At']);
    const featuredBrand = last['Featured Brand'];

    console.log('Now:', now.toISOString());
    console.log('Expiry from sheet:', last['Expires At']);
    console.log('Parsed Expiry:', expiry.toISOString());
    console.log('Featured Brand:', featuredBrand);

    const storedBrand = localStorage.getItem('selectedFavoriteBrand');
    const originalBrand = localStorage.getItem('originalBrand');

    if (now < expiry && featuredBrand) {
      if (!originalBrand && storedBrand && storedBrand !== featuredBrand) {
        localStorage.setItem('originalBrand', storedBrand);
      }

      localStorage.setItem('selectedFavoriteBrand', featuredBrand);
      localStorage.setItem('tempExpiryTime', expiry.getTime());
      console.log('tempExpiryTime set to:', expiry.getTime());
    } else {
      if (originalBrand) {
        localStorage.setItem('selectedFavoriteBrand', originalBrand);
        localStorage.removeItem('originalBrand');
      }
      localStorage.removeItem('tempExpiryTime');
      console.log('Expired or missing brand — reset to original.');
    }
  });

///////////  Takeover Brand Fetch (Sheet5)

fetch('https://opensheet.elk.sh/1_DyGLoYi5ndEkiwhPEzJhMc3vciIFNhN2g-H0gbVRds/Sheet5')
  .then(res => res.json())
  .then(data => {
   if (!data || data.length === 0) {
    console.log("Takeover Brand sheet is empty, skipping.");
    return;
   }
    const last = data[data.length - 1];
    const now = new Date();
    const expiry = new Date(last['Expires At']);
    const takeoverBrand = last['Take Over Brand'];

    console.log('Now:', now.toISOString());
    console.log('Expiry from sheet:', last['Expires At']);
    console.log('Parsed Expiry:', expiry.toISOString());
    console.log('Take Over Brand:', takeoverBrand);

    const overrideUntil = parseInt(sessionStorage.getItem('overrideTakeoverUntil') || '0', 10);
    const overrideBrand = sessionStorage.getItem('originalTakeoverBrand');
    const storedBrand = localStorage.getItem('selectedTakeoverBrand');
    const originalBrand = localStorage.getItem('originalTakeoverBrand');

    if (Date.now() < overrideUntil) {
      // Override still active
      console.log('🟡 Override in effect until', new Date(overrideUntil).toISOString());
      return;
    } else {
      // Override expired, cleanup override session keys
      sessionStorage.removeItem('overrideTakeoverUntil');
      sessionStorage.removeItem('originalTakeoverBrand');
    }

    if (now < expiry && takeoverBrand) {
      // Only store original if it hasn't already been saved
      if (!originalBrand && storedBrand && storedBrand !== takeoverBrand) {
        localStorage.setItem('originalTakeoverBrand', storedBrand);
      }

      localStorage.setItem('selectedTakeoverBrand', takeoverBrand);
      localStorage.setItem('takeoverExpiryTime', expiry.getTime());
      console.log('✅ Takeover brand set:', takeoverBrand, 'Expires at:', expiry.toISOString());
    } else {
      // Expired or missing — restore original if it exists
      if (originalBrand) {
        localStorage.setItem('selectedTakeoverBrand', originalBrand);
        localStorage.removeItem('originalTakeoverBrand');
        console.log('🔁 Restored original brand:', originalBrand);
      } else {
        localStorage.removeItem('selectedTakeoverBrand');
        console.log('❌ No brand to restore — cleaned up');
      }

      localStorage.removeItem('takeoverExpiryTime');
    }
  });

///////////  Ranked Slots Fetch (Sheet2)

fetch('https://opensheet.elk.sh/1_DyGLoYi5ndEkiwhPEzJhMc3vciIFNhN2g-H0gbVRds/sheet2')
  .then(res => res.json())
  .then(data => {
    const now = new Date();

    data.forEach((row, i) => {
      const brand = row['Brand'];          // Adjust keys if necessary
      const expiry = new Date(row['Expires At']); // Adjust keys if necessary

      const slotKey = `rankedSlot${i + 1}`;
      const expiryKey = `${slotKey}Expiry`;

      if (brand && expiry && now < expiry) {
        localStorage.setItem(slotKey, brand);
        localStorage.setItem(expiryKey, expiry.getTime());
        console.log(`Set ${slotKey} to ${brand} (expires at ${expiry})`);
      } else {
        localStorage.removeItem(slotKey);
        localStorage.removeItem(expiryKey);
        console.log(`${slotKey} expired or missing — cleared.`);
      }
    });
  });
