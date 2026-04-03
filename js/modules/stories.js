/**
 * Stories Module
 * Handles story swiper functionality
 */

const STORY_SHEET_URL = 'https://opensheet.elk.sh/1_DyGLoYi5ndEkiwhPEzJhMc3vciIFNhN2g-H0gbVRds/sheet7';
let storyMap = {};
let sequenceRanges = [];
let swiper;
let isJumping = false;

async function loadStories() {
  const res = await fetch(STORY_SHEET_URL);
  const data = await res.json();

  sequenceRanges = [];
  storyMap = {}; // reset

  let currentSequence = '';
  let currentStartIndex = 0;

  data.forEach((story, index) => {
    // Detect new sequence start
    if (parseInt(story['Slide #']) === 1 && story['Story Title']) {
      if (currentSequence) {
        sequenceRanges.push({ title: currentSequence, start: currentStartIndex, end: index - 1 });
      }
      currentSequence = story['Story Title'].trim();
      currentStartIndex = index;
    }

    // Map every slide title (e.g., headline) to its index for jumps
    if (parseInt(story['Slide #']) === 1 && story['Story Title']) {
      const normalizedTitle = story['Story Title'].trim().toLowerCase();
      if (!(normalizedTitle in storyMap)) {
        storyMap[normalizedTitle] = index;
      }
    }
  });

  if (currentSequence) {
    sequenceRanges.push({ title: currentSequence, start: currentStartIndex, end: data.length - 1 });
  }

  // Build slidesData array
  window.slidesData = data
    .map((story, index) => {
      if (!story['Image URL']) return null;

      let sequenceName = '';
      for (let seq of sequenceRanges) {
        if (index >= seq.start && index <= seq.end) {
          sequenceName = seq.title;
          break;
        }
      }

      return {
        index,
        sequence: sequenceName,
        image: story['Image URL'],
        title: (parseInt(story['Slide #']) === 1 && story['Story Title']) ? story['Story Title'] : story['Title'],
        description: story['Description'],
        ctaText: story['CTA Text'],
        ctaLink: story['CTA Link'],
        ctaText2: story['CTA Text 2'],
        storyJump: story['Story Jump'],
        sponsored: story['Sponsored'],
        brandLogo: story['Brand Logo'],
      };
    })
    .filter(Boolean);

  showStoryList();
}

function groupSlidesBySequence(slides) {
  const sequences = {};
  slides.forEach(slide => {
    if (!sequences[slide.sequence]) sequences[slide.sequence] = [];
    sequences[slide.sequence].push(slide);
  });
  return sequences;
}

function renderSlides(slides) {
  const wrapper = document.getElementById('storyWrapper');
  wrapper.innerHTML = '';

  slides.forEach((story, i) => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.style.backgroundImage = `url(${story.image})`;

    slide.dataset.index = story.globalIndex ?? i;

    const overlay = document.createElement('div');
    overlay.className = 'slide-overlay';

    // Big headline for first slide in sequence (Slide # 1)
    if (parseInt(story.index) === slides[0].index) {
      slide.classList.add('headline-slide');
      const title = document.createElement('div');
      title.className = 'slide-title';
      title.textContent = story.title;
      overlay.appendChild(title);
    } else if (story.title) {
      const title = document.createElement('div');
      title.className = 'slide-title';
      title.textContent = story.title;
      overlay.appendChild(title);
    }

    if (story.description) {
      const desc = document.createElement('div');
      desc.className = 'slide-desc';
      desc.textContent = story.description;
      overlay.appendChild(desc);
    }

    const ctaContainer = document.createElement('div');
    ctaContainer.className = 'cta-container';

    if (story.ctaText && story.ctaLink) {
      const linkBtn = document.createElement('a');
      linkBtn.className = 'cta-button cta-link-button';
      linkBtn.href = story.ctaLink;
      linkBtn.target = '_blank';
      linkBtn.textContent = story.ctaText;
      linkBtn.addEventListener('click', e => e.stopPropagation());
      ctaContainer.appendChild(linkBtn);
    }

    if (story.ctaText2 && story.storyJump) {
      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'cta-button cta-jump-button';
      jumpBtn.textContent = story.ctaText2;

      jumpBtn.addEventListener('click', e => {
        e.stopPropagation();

        if (isJumping) return; // avoid double-tap issues
        isJumping = true; // lock early

        const jumpTitle = story.storyJump.trim().toLowerCase();
        const jumpIndex = storyMap[jumpTitle];

        if (jumpIndex !== undefined) {
          const jumpSlide = window.slidesData[jumpIndex];
          const jumpSequence = jumpSlide.sequence;

          const sequences = groupSlidesBySequence(window.slidesData || []);
          const slidesInSequence = sequences[jumpSequence] || [];
          const localIndex = slidesInSequence.findIndex(slide => slide.index == jumpIndex);

          if (localIndex !== -1) {
            openStorySequence(jumpSequence, localIndex); // will handle isJumping reset
          } else {
            console.warn('Jump target found globally, but not within sequence:', jumpSequence);
            isJumping = false;
          }

        } else {
          console.warn('Jump target not found:', story.storyJump);
          console.log('Available titles:', Object.keys(storyMap));
          isJumping = false;
        }
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'cta-button cta-close-button';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeStoryViewer();
      });
      ctaContainer.appendChild(jumpBtn);
      ctaContainer.appendChild(closeBtn);
    }

    if (ctaContainer.childElementCount > 0) {
      overlay.appendChild(ctaContainer);
    }

    if (story.sponsored && story.sponsored.toLowerCase() === 'true') {
      const label = document.createElement('div');
      label.className = 'sponsored-label';
      label.textContent = 'Sponsored';
      slide.appendChild(label);
    }

    if (story.brandLogo) {
      const logo = document.createElement('img');
      logo.className = 'brand-logo';
      logo.src = story.brandLogo;
      logo.alt = 'Logo';
      slide.appendChild(logo);
    }

    slide.appendChild(overlay);
    wrapper.appendChild(slide);
  });
}

function closeStoryViewer() {
  if (isJumping) return; // Prevent closing during a jump transition

  const swiperContainer = document.querySelector('.swiper');
  const storyList = document.getElementById('storyListContainer');
  const viewAllBtn = document.getElementById('viewAllButton');

  if (swiperContainer) {
    swiperContainer.style.display = 'none'; // Hide swiper
  }

  if (swiper) {
    swiper.destroy(true, true);
    swiper = null;
  }

  if (storyList) {
    storyList.style.display = 'grid'; // Show story grid
  }

  if (viewAllBtn) {
    viewAllBtn.style.display = 'inline-block'; // Show 'View All' button
  }

  document.body.classList.remove('popup-open');
}

function initSwiper() {
  if (swiper) swiper.destroy(true, true);

  swiper = new Swiper('.swiper', {
    direction: 'horizontal',
    slidesPerView: 1,
    allowTouchMove: false,
    watchSlidesProgress: true,
    observer: true,
    observeParents: true,
  });

  swiper.on('slideChangeTransitionEnd', () => {
    updateProgress(swiper.activeIndex);
  });

  // Tap zones for navigation
  const tapLeft = document.getElementById('tapLeft');
  const tapRight = document.getElementById('tapRight');
  if (tapLeft) tapLeft.onclick = () => swiper.slidePrev();
  if (tapRight) tapRight.onclick = () => swiper.slideNext();
}

function updateProgress(index) {
  const progressBar = document.getElementById('progressBar');
  if (!swiper || !progressBar) return;

  const total = swiper.slides.length;

  progressBar.innerHTML = ''; // Clear previous segments

  for (let i = 0; i < total; i++) {
    const seg = document.createElement('div');
    seg.className = 'progress-segment';

    const fill = document.createElement('div');
    fill.className = 'progress-fill';

    if (i < index) {
      fill.style.width = '100%';
    } else if (i === index) {
      fill.style.width = '0%';
      fill.style.transition = 'width 5s linear';
      requestAnimationFrame(() => {
        fill.style.width = '100%';
      });
    }

    seg.appendChild(fill);
    progressBar.appendChild(seg);
  }
}

function renderStoryTiles() {
  const container = document.getElementById('storyListContainer');
  container.innerHTML = '';

  const sequences = groupSlidesBySequence(window.slidesData || []);
  Object.keys(sequences).forEach(seqKey => {
    const firstSlide = sequences[seqKey][0];
    const tile = document.createElement('div');
    tile.className = 'story-tile';
    tile.onclick = () => {
      openStorySequence(seqKey);
    };
    tile.innerHTML = `
      <img src="${firstSlide.image || ''}" alt="Story preview">
      <h3>${firstSlide.title || 'Untitled'}</h3>
    `;
    container.appendChild(tile);
  });
}

function openStorySequence(sequenceKey, startIndex = 0) {
  const sequences = groupSlidesBySequence(window.slidesData || []);
  const sequenceSlides = sequences[sequenceKey];
  if (!sequenceSlides) {
    isJumping = false;
    return;
  }

  const swiperContainer = document.querySelector('.swiper');
  if (swiperContainer) {
    swiperContainer.style.display = 'block';
  }

  renderSlides(sequenceSlides);

  setTimeout(() => {
    if (!swiper) {
      initSwiper();
    } else {
      swiper.update();
    }

    swiper.slideTo(startIndex);
    updateProgress(startIndex);

    setTimeout(() => {
      isJumping = false;
    }, 300);
  }, 50);
}

function showStoryList() {
  if (!window.slidesData) {
    loadStories().then(actuallyShowTiles);
  } else {
    actuallyShowTiles();
  }

  function actuallyShowTiles() {
    const popup = document.getElementById('storyListPopup');
    if (popup) popup.style.display = 'flex';
    renderStoryTiles();
  }
}

function closeStoryListPopup() {
  const popup = document.getElementById('storyListPopup');
  if (popup) popup.style.display = 'none';
}

// Set up listeners immediately (DOM already loaded when module runs)
const viewAllBtn = document.getElementById('viewAllButton');
const closeBtn = document.getElementById('closeStoryListPopupBtn');

if (viewAllBtn) viewAllBtn.addEventListener('click', showStoryList);
if (closeBtn) closeBtn.addEventListener('click', closeStoryListPopup);