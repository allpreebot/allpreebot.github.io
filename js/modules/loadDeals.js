/**
 * Load Deals Module
 * Main deal loading and rendering logic
 */

async function loadDeals() {
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const favoriteBrand = localStorage.getItem('selectedFavoriteBrand');
  const container = document.getElementById('deals-container');
  container.innerHTML = '';
  allBrandsData.length = 0;
  allDealsFlat.length = 0;
  let currentlyOpenGrid = null;

  // ============================================
  // RESTORATION LOGIC (runs first)
  // ============================================
  
  const now = Date.now();
  
  // Restore from "All Stores" override
  const overrideUntil = parseInt(sessionStorage.getItem('overrideTakeoverUntil'), 10);
  if (overrideUntil && now >= overrideUntil) {
    const originalTakeover = sessionStorage.getItem('originalTakeoverBrand');
    if (originalTakeover) {
      localStorage.setItem('selectedTakeoverBrand', originalTakeover);
    }
    sessionStorage.removeItem('overrideTakeoverUntil');
    sessionStorage.removeItem('originalTakeoverBrand');
  }

  // Restore from "My List" override
  const myListTimer = parseInt(sessionStorage.getItem('myListTimer'), 10);
  if (myListTimer && now >= myListTimer) {
    const originalTakeover = sessionStorage.getItem('originalTakeoverBrand');
    if (originalTakeover) {
      localStorage.setItem('selectedTakeoverBrand', originalTakeover);
    }
    sessionStorage.removeItem('myListActive');
    sessionStorage.removeItem('myListTimer');
    sessionStorage.removeItem('originalTakeoverBrand');
  }

  // ============================================
  // MODE DETECTION
  // ============================================
  
  const selectedTakeoverBrand = localStorage.getItem('selectedTakeoverBrand');
  const isTakeover = selectedTakeoverBrand !== null;
  
  // Flags for sheet filtering (like isOverrideActive)
  let isOverrideActive = false;
  let isMyListActive = false;
  
  // Get My List
  const myStoresList = typeof getMyStores === 'function' ? getMyStores() : [];
  
  // Check which mode is active
  if (isTakeover) {
    isOverrideActive = true;
    console.log('Takeover mode: showing brand:', selectedTakeoverBrand);
  } else if (sessionStorage.getItem('myListActive') === 'true') {
    const myListTimer = parseInt(sessionStorage.getItem('myListTimer'), 10);
    if (myListTimer && now < myListTimer) {
      isMyListActive = true;
      console.log('My List mode: showing brands from list:', myStoresList);
    }
  }

  // Load sheets in chunks of 5 to avoid overwhelming Jamaica's mobile network
  // Sheets are already priority-sorted: takeover → favorite → ranked → rest
  const CHUNK_SIZE = 5;
  const allResponses = [];
  
  for (let c = 0; c < sheetUrls.length; c += CHUNK_SIZE) {
    const chunk = sheetUrls.slice(c, c + CHUNK_SIZE);
    const chunkResponses = await Promise.all(
      chunk.map(url => fetchWithTimeout(url))
    );
    allResponses.push(...chunkResponses);
    console.log('[Deals] Loaded chunk ' + Math.floor(c / CHUNK_SIZE + 1) + '/' + Math.ceil(sheetUrls.length / CHUNK_SIZE));
  }

  for (let i = 0; i < allResponses.length; i++) {
    const rows = allResponses[i];

    // ============================================
    // SHEET FILTERING
    // ============================================
    
    // Takeover: Only show sheets with the takeover brand
    if (isOverrideActive && !rows.some(row => row.BrandName === selectedTakeoverBrand)) {
      console.log('Skipping sheet ' + i + ' due to active takeover mode.');
      continue;
    }
    
    // My List: Only show sheets with brands from the list
    if (isMyListActive) {
      const hasMyStoreBrand = rows.some(row => 
        myStoresList.some(storeBrand => 
          row.BrandName && row.BrandName.toLowerCase().includes(storeBrand.toLowerCase())
        )
      );
      if (!hasMyStoreBrand) {
        console.log('Skipping sheet ' + i + ' due to active My List mode.');
        continue;
      }
    }

    const hasActiveRow = rows.some(row => row.Active?.toLowerCase() === 'yes');
    if (!hasActiveRow) {
      console.log('Sheet ' + i + ' has no active rows. Skipping.');
      continue;
    }

    if (rows.error) {
      console.warn('Skipping sheet (timeout or error):', sheetUrls[i], rows.error);
      continue;
    }

    try {
      let currentBrand = '';
      let currentLogo = '';
      let currentPrimaryColor = '';
      let currentSecondaryColor = '';
      let brandSection = null;
      let grid = null;
      let brandDeals = [];
      let expireDate = '';
      let isFavorite = false;

      rows.forEach(row => {
        try {
          if (row.BrandName && row.BrandLogo) {
            currentBrand = row.BrandName;
            currentLogo = row.BrandLogo;
            currentPrimaryColor = row.PrimaryColor || '#163A5C';
            currentSecondaryColor = row.SecondaryColor || '#2066A7';
            isFavorite = currentBrand === favoriteBrand;
            
            let isPaidBrand = row.Pro === 'true' || row.Premium === 'true' || row.Starter === 'true' || row.Exclusive === 'true';

            brandSection = document.createElement('div');
            brandSection.className = 'brand-section';

            const brandDiv = document.createElement('div');
            brandDiv.className = 'brand';
            const timerId = 'timer-' + Math.random().toString(36).substring(2);

            brandDiv.innerHTML = '<div class="brand-logo-container"><img src="' + currentLogo + '" alt="' + currentBrand + '" /></div><div><span class="brand-name">' + currentBrand + '</span><br><span class="brand-timer" id="' + timerId + '">Click The Pin To Find Our Location </span></div>';

            const locationBadge = document.createElement('div');
            locationBadge.className = 'location-badge';
            const townName = row.Town || row['Town'] || '';
            locationBadge.textContent = townName ? '📍 ' + townName : '📍';
            locationBadge.addEventListener('click', (event) => {
              event.stopPropagation();
              openBrandLocation(currentBrand);
            });

            const logoContainer = brandDiv.querySelector('.brand-logo-container');
            if (logoContainer) {
              logoContainer.appendChild(locationBadge);
            }

            if (isPaidBrand) {
              const badge = document.createElement('div');

              if (row.Pro === 'true') {
                badge.className = 'badge-pro';
                badge.textContent = '👑';
                brandDiv.classList.add('pro-brand-highlight');
              } else if (row.Premium === 'true') {
                badge.className = 'badge-premium';
                badge.textContent = '💎';
                brandDiv.classList.add('premium-brand-highlight');
              } else if (row.Starter === 'true') {
                badge.className = 'badge-starter';
                badge.textContent = '🎁';
                brandDiv.classList.add('starter-brand-highlight');
              } else if (row.Exclusive === 'true') {
                badge.className = 'badge-exclusive';
                badge.textContent = '🏆';
                brandDiv.classList.add('exclusive-brand-highlight');
              }

              brandDiv.querySelector('.brand-logo-container').appendChild(badge);
            }

            const expireDateStr = row.ExpiryDate || row.expireDate;
            const parsedDate = Date.parse(expireDateStr);

            if (isNaN(parsedDate) || parsedDate < Date.now()) {
              const el = document.getElementById(timerId);
              if (el) {
                el.textContent = '⏳ Coming soon';
                el.classList.add('countdown-upcoming');
              }
            } else {
              startBrandCountdown(expireDateStr, timerId);
            }

            brandSection.appendChild(brandDiv);

            grid = document.createElement('div');
            grid.className = 'deal-grid';
            grid.style.display = 'none';
            brandSection.appendChild(grid);

            brandDiv.style.cursor = 'pointer';

            const localDeals = brandDeals;

            brandDiv.addEventListener('click', () => {
              const isOpen = grid.style.display === 'grid';

              if (currentlyOpenGrid && currentlyOpenGrid !== grid) {
                currentlyOpenGrid.style.display = 'none';
              }

              grid.style.display = isOpen ? 'none' : 'grid';

              if (!isOpen) {
                grid.innerHTML = '';

                const shuffled = shuffleArray([...localDeals]);
                shuffled.forEach((d, index) => {
                  d.element.style.animationDelay = (index * 50) + 'ms';
                  d.element.classList.add('deal-item');
                  grid.appendChild(d.element);
                });

                const headerHeight = 35;
                const likedDealsSection = document.getElementById('likedDealsSection');
                const likedVisible = likedDealsSection && likedDealsSection.offsetParent !== null;
                const extraOffset = likedVisible ? 5 : 0;
                const top = brandDiv.getBoundingClientRect().top + window.scrollY - headerHeight - extraOffset;
                window.scrollTo({ top, behavior: 'smooth' });
              }

              currentlyOpenGrid = grid.style.display === 'grid' ? grid : null;
            });

            container.appendChild(brandSection);

            if (expireDateStr) {
              expireDate = new Date(expireDateStr);
              if (!isNaN(expireDate)) {
                startBrandCountdown(expireDate, timerId);
              }
            }

            allBrandsData.push({
              brand: currentBrand,
              logo: currentLogo,
              expireDate,
              section: brandSection,
              grid,
              deals: brandDeals,
              primaryColor: currentPrimaryColor,
              secondaryColor: currentSecondaryColor,
              isFavorite,
              isPaidBrand: row.Pro === 'true' || row.Premium === 'true' || row.Starter === 'true' || row.Exclusive === 'true',
              isPro: row.Pro === 'true',
              Pro: row.Pro,
              Premium: row.Premium,
              Starter: row.Starter,
              Exclusive: row.Exclusive
            });
          }

          if (row.ProductName && row.ImageURL && row.OriginalPrice && row.DiscountPrice) {
            const original = parseFloat(row.OriginalPrice.replace(/,/g, '')) || 0;
            const discount = parseFloat(row.DiscountPrice.replace(/,/g, '')) || 0;
            const percentOff = original && discount ? Math.round((1 - discount / original) * 100) : 0;
            const shortName = row.ProductName.length > 15 ? row.ProductName.slice(0, 15) + '...' : row.ProductName;

            const dealCard = document.createElement('div');
            dealCard.className = 'deal';

            if (expireDate && new Date() > expireDate) {
              dealCard.classList.add('deal-expired');
            }

            dealCard.innerHTML = '<span class="discount-badge">' + percentOff + '% OFF</span><img src="' + row.ImageURL + '" alt="' + row.ProductName + '"><div class="deal-content"><div class="deal-title">' + shortName + '</div><div class="price">JMD $' + row.OriginalPrice + '</div><div class="discount">JMD $' + row.DiscountPrice + '</div></div>';

            const dealData = {
              image: row.ImageURL,
              name: row.ProductName,
              original: row.OriginalPrice,
              discount: row.DiscountPrice,
              description: row.Description,
              brandLogo: currentLogo,
              brandName: currentBrand,
              sourceUrl: sheetUrls[i]
            };

            const isLiked = !!likedDeals[dealData.name];

            dealCard.addEventListener('click', () => {
              if (!dealData) return;
              isLikedMode = false;
              document.getElementById('showRandomBtn')?.classList.add('active');
              document.getElementById('showLikedBtn')?.classList.remove('active');

              const brandData = allBrandsData.find(brand => brand.brand === dealData.brandName);

              if (brandData) {
                if (brandData.isFavorite) {
                  openPopup(dealData);
                  showBrandDealsInPopup(brandData.brand);
                  activateBrandTab();
                } else {
                  openPopup(dealData);
                }
              } else {
                openPopup(dealData);
              }
              
              setTimeout(() => {
                addPopupSwipeListeners();
              }, 100);
            });

            if (!isLiked) {
              allDealsFlat.push(dealData);
              brandDeals.push({
                element: dealCard,
                percentOff,
                expireDate: row.expireDate
              });
            } else {
              allDealsFlat.push(dealData);
            }
          }
        } catch (rowErr) {
          console.warn('Skipped bad deal row:', rowErr);
        }
      });
    } catch (sheetErr) {
      console.warn('Error processing a sheet:', sheetErr);
    }
  }

  // Sort and render brands
  allBrandsData.forEach(brandData => {
    shuffleArray(brandData.deals);
    brandData.deals.forEach(d => brandData.grid.appendChild(d.element));
    brandData.bestDiscount = Math.max(...brandData.deals.map(d => d.percentOff));
    brandData.timeRemaining = brandData.expireDate
      ? new Date(brandData.expireDate).getTime() - Date.now()
      : Infinity;
  });

  allBrandsData.sort((a, b) => {
    if (b.bestDiscount !== a.bestDiscount) {
      return b.bestDiscount - a.bestDiscount;
    }
    return a.timeRemaining - b.timeRemaining;
  });

  container.innerHTML = '';

  // Render liked deals section
  let likedDealsSection = document.getElementById('likedDealsSection');
  if (!likedDealsSection) {
    likedDealsSection = document.createElement('div');
    likedDealsSection.id = 'likedDealsSection';
    likedDealsSection.style.display = 'none';
    likedDealsSection.style.marginBottom = '1rem';
    likedDealsSection.innerHTML = '<div id="likedDealsGallery" class="likedDealsGallery"></div>';
    container.appendChild(likedDealsSection);
  }

  renderLikedDealsGallery();

  // Handle takeover and favorite brands
  const takeoverBrandData = isTakeover
    ? allBrandsData.find(b => b.brand === selectedTakeoverBrand)
    : null;

  if (takeoverBrandData?.grid) {
    takeoverBrandData.grid.classList.add('takeover-active');
  }

  const favoriteBrandData = allBrandsData.find(brand => brand.isFavorite);
  const brandToShow = takeoverBrandData || favoriteBrandData;

  if (brandToShow) {
    const favBadge = document.createElement('div');
    favBadge.className = 'favorite-brand-badge';
    favBadge.textContent = isTakeover ? '💥 Exclusive Brand' : '⭐ Featured Brand';
    const primaryColor = brandToShow.primaryColor?.trim() || '#163A5C';
    favBadge.style.backgroundColor = primaryColor;
    brandToShow.section.querySelector('.brand-logo-container').appendChild(favBadge);

    if (brandToShow.secondaryColor) {
      const brandElement = brandToShow.section.querySelector('.brand');
      brandElement.classList.add('favorite-brand-highlight');
      const secondaryColor = brandToShow.secondaryColor.trim();
      brandElement.style.setProperty('--highlight-border-color', secondaryColor);

      const pulseColor = toSemiTransparent(secondaryColor, 0.6);
      let pulseActive = true;
      setInterval(() => {
        brandElement.style.boxShadow = pulseActive ? '0 0 10px ' + secondaryColor : '0 0 20px ' + pulseColor;
        pulseActive = !pulseActive;
      }, 1000);
    }

    brandToShow.grid.style.display = 'grid';
    currentlyOpenGrid = brandToShow.grid;

    container.appendChild(brandToShow.section);
  }

  // ============================================
  // BUTTONS - Show when Takeover is active
  // ============================================
  
  if (isTakeover) {
    // Create button container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'override-buttons-container';
    buttonsContainer.style.cssText = 'display: flex; flex-direction: row; justify-content: center; gap: 1rem; margin: 1rem 0;';

    // "All Stores" button - shows ALL brands temporarily
    const overrideBtn = document.createElement('button');
    overrideBtn.textContent = 'All Stores';
    overrideBtn.id = 'overrideButton';
    overrideBtn.className = 'override-button';

    overrideBtn.addEventListener('click', () => {
      const originalTakeover = localStorage.getItem('selectedTakeoverBrand');

      if (originalTakeover) {
        sessionStorage.setItem('originalTakeoverBrand', originalTakeover);
        sessionStorage.setItem('overrideTakeoverUntil', (Date.now() + 60 * 1000).toString());
        localStorage.removeItem('selectedTakeoverBrand');
      }

      location.reload();
    });

    buttonsContainer.appendChild(overrideBtn);

    // "My List" button - shows ONLY brands from list temporarily
    if (myStoresList.length > 0) {
      const myListBtn = document.createElement('button');
      myListBtn.textContent = 'My List (' + myStoresList.length + ')';
      myListBtn.id = 'myListButton';
      myListBtn.className = 'override-button';

      myListBtn.addEventListener('click', () => {
        const originalTakeover = localStorage.getItem('selectedTakeoverBrand');

        if (originalTakeover) {
          sessionStorage.setItem('originalTakeoverBrand', originalTakeover);
          sessionStorage.setItem('myListActive', 'true');
          sessionStorage.setItem('myListTimer', (Date.now() + 60 * 1000).toString());
          localStorage.removeItem('selectedTakeoverBrand');
        }

        location.reload();
      });

      buttonsContainer.appendChild(myListBtn);
    }
    
    container.appendChild(buttonsContainer);
    
    if (typeof updateOfflineButtons === 'function') {
      updateOfflineButtons();
    }
  }

  // Hide the takeover button if a brand is already selected
  const takeoverButton = document.getElementById('takeover-brand-button');
  if (takeoverButton && localStorage.getItem('selectedTakeoverBrand')) {
    takeoverButton.style.display = 'none';
  }

  // Render promoted brands (ranked slots)
  const promotedBrands = [];
  for (let i = 1; i <= 5; i++) {
    const brandName = localStorage.getItem('rankedSlot' + i);
    const expiry = parseInt(localStorage.getItem('rankedSlot' + i + 'Expiry'), 10);

    if (brandName && !isNaN(expiry) && Date.now() < expiry) {
      const match = allBrandsData.find(b => b.brand === brandName && !b.isFavorite && b.brand !== selectedTakeoverBrand);
      if (match && !promotedBrands.includes(match)) {
        const badge = document.createElement('div');
        badge.className = 'top-ranked-badge';
        badge.textContent = '🌟' + i;

        const logoContainer = match.section.querySelector('.brand-logo-container');
        if (logoContainer) logoContainer.appendChild(badge);
        match.section.querySelector('.brand')?.classList.add('top-ranked-highlight');

        promotedBrands.push(match);
      }
    }
  }

  promotedBrands.forEach(b => container.appendChild(b.section));

  // Render remaining brands
  const promotedSet = new Set(promotedBrands.map(b => b.brand));
  
  allBrandsData.forEach(brandData => {
    if (brandData.brand !== selectedTakeoverBrand && !brandData.isFavorite && !promotedSet.has(brandData.brand)) {
      if (brandData.bestDiscount === Math.max(...allBrandsData.map(b => b.bestDiscount))) {
        const badge = document.createElement('div');
        badge.className = 'top-deal-badge';
        badge.textContent = '🔥 Hottest Discount';
        brandData.section.querySelector('.brand-logo-container').appendChild(badge);
        brandData.section.querySelector('.brand').classList.add('top-brand-highlight');
      }

      container.appendChild(brandData.section);
    }
  });

  // No deals message
  const noDealsMessage = document.createElement('div');
  noDealsMessage.id = 'noDealsMessage';
  noDealsMessage.textContent = '🚫 No App deals available right now. Use your digital or physical (Smart Allpree Card) To Shop In-store';
  noDealsMessage.style.textAlign = 'center';
  noDealsMessage.style.fontWeight = 'bold';
  noDealsMessage.style.marginTop = '2rem';
  noDealsMessage.style.display = 'none';
  container.appendChild(noDealsMessage);

  if (allDealsFlat.length === 0) {
    document.getElementById('noDealsMessage').style.display = 'block';
  }

  setTimeout(() => {
    cleanUpLikedDeals();
  }, 3000);
}