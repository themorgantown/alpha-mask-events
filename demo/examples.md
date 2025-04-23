## Additional Use Cases

### Interactive Product Customizer

Create an interactive product customizer where users can click different parts of a product to customize specific areas:

```html
<div class="product-customizer">
  <img src="product-base.jpg" class="product-image" />
  <!-- Each overlay represents a customizable area -->
  <img src="customizable-part1.png" class="alpha-mask-events part" data-part="sleeve" />
  <img src="customizable-part2.png" class="alpha-mask-events part" data-part="body" />
  <img src="customizable-part3.png" class="alpha-mask-events part" data-part="collar" />
</div>

<script>
  import AME from 'alpha-mask-events';
  
  // Initialize with high precision
  AME.init({ threshold: 0.95 });
  
  // Handle customization when clicking specific parts
  document.querySelectorAll('.part').forEach(part => {
    part.addEventListener('click', () => {
      openColorSelector(part.dataset.part);
    });
  });
  
  function openColorSelector(partName) {
    console.log(`Opening color selector for ${partName}`);
    // Show color picker UI for the selected part
  }
</script>
```

### Interactive Infographics

Create engaging data visualizations where specific regions are clickable for additional information:

```html
<div class="infographic-container">
  <img src="world-map.png" class="base-map" />
  <!-- Each region is a transparent PNG with opaque areas only where the region exists -->
  <img src="region-europe.png" class="alpha-mask-events region" data-region="europe" />
  <img src="region-asia.png" class="alpha-mask-events region" data-region="asia" />
  <img src="region-africa.png" class="alpha-mask-events region" data-region="africa" />
</div>

<div id="data-popup" class="hidden">
  <h3 id="region-title"></h3>
  <div id="region-data"></div>
</div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init();
  
  const popup = document.getElementById('data-popup');
  const regionTitle = document.getElementById('region-title');
  const regionData = document.getElementById('region-data');
  
  const regionInfo = {
    'europe': { title: 'Europe', data: 'Population: 746 million, GDP: $23 trillion' },
    'asia': { title: 'Asia', data: 'Population: 4.7 billion, GDP: $34 trillion' },
    'africa': { title: 'Africa', data: 'Population: 1.4 billion, GDP: $2.7 trillion' }
  };
  
  document.querySelectorAll('.region').forEach(region => {
    region.addEventListener('click', (e) => {
      const info = regionInfo[region.dataset.region];
      
      regionTitle.textContent = info.title;
      regionData.textContent = info.data;
      
      // Position popup near click
      popup.style.left = `${e.clientX + 20}px`;
      popup.style.top = `${e.clientY + 20}px`;
      popup.classList.remove('hidden');
    });
  });
</script>
```

### Game Development - Click Area Detection

Create casual web games with precise hit detection for irregular shapes:

```html
<div class="game-container">
  <img src="game-background.jpg" class="game-bg" />
  <img src="target1.png" class="alpha-mask-events target" data-points="10" />
  <img src="target2.png" class="alpha-mask-events target" data-points="20" />
  <img src="target3.png" class="alpha-mask-events target" data-points="30" />
</div>

<div id="score">Score: 0</div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init({ threshold: 0.9 });
  
  let score = 0;
  const scoreDisplay = document.getElementById('score');
  
  document.querySelectorAll('.target').forEach(target => {
    target.addEventListener('click', () => {
      const points = parseInt(target.dataset.points);
      score += points;
      scoreDisplay.textContent = `Score: ${score}`;
      
      // Animate the hit target
      target.classList.add('hit');
      
      // Generate a new target
      setTimeout(() => {
        target.classList.remove('hit');
        repositionTarget(target);
      }, 1000);
    });
  });
  
  function repositionTarget(target) {
    // Randomly position the target within the game container
    const container = document.querySelector('.game-container');
    const maxX = container.clientWidth - target.width;
    const maxY = container.clientHeight - target.height;
    
    target.style.left = `${Math.random() * maxX}px`;
    target.style.top = `${Math.random() * maxY}px`;
  }
</script>
```

### Interactive Floor Plan Navigation

Create interactive building floor plans where rooms and areas provide information on hover/click:

```html
<div class="floor-plan-container">
  <img src="floor-plan-base.png" class="floor-plan" />
  <img src="room-101.png" class="alpha-mask-events room" data-room="101" data-info="Conference Room A - Capacity: 12" />
  <img src="room-102.png" class="alpha-mask-events room" data-room="102" data-info="Executive Office - Jane Smith" />
  <img src="lounge.png" class="alpha-mask-events room" data-room="lounge" data-info="Break Area - Amenities: Coffee, Snacks, TV" />
</div>

<div id="room-tooltip" class="hidden"></div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init();
  
  const tooltip = document.getElementById('room-tooltip');
  
  document.querySelectorAll('.room').forEach(room => {
    // Show tooltip on hover
    room.addEventListener('mouseenter', (e) => {
      tooltip.textContent = `Room ${room.dataset.room}: ${room.dataset.info}`;
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
      tooltip.classList.remove('hidden');
    });
    
    room.addEventListener('mousemove', (e) => {
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    });
    
    room.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
    
    // Show detailed modal on click
    room.addEventListener('click', () => {
      showRoomDetails(room.dataset.room);
    });
  });
  
  function showRoomDetails(roomId) {
    // Display a modal with detailed room information
    console.log(`Showing details for room: ${roomId}`);
  }
</script>
```

### E-commerce Product Hotspots

Create interactive product images with feature hotspots that highlight specific aspects:

```html
<div class="product-showcase">
  <img src="product-main.jpg" class="product-image" />
  <!-- Each hotspot is a transparent PNG with only the hotspot indicator visible -->
  <img src="hotspot1.png" class="alpha-mask-events hotspot" data-feature="carbon-fiber-frame" />
  <img src="hotspot2.png" class="alpha-mask-events hotspot" data-feature="titanium-gears" />
  <img src="hotspot3.png" class="alpha-mask-events hotspot" data-feature="smart-display" />
</div>

<div class="feature-description">
  <h3>Product Features</h3>
  <p id="feature-text">Click on a hotspot to learn more</p>
</div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init();
  
  const featureText = document.getElementById('feature-text');
  
  const featureInfo = {
    'carbon-fiber-frame': 'Ultra-lightweight carbon fiber frame provides durability with minimal weight penalty.',
    'titanium-gears': 'Precision titanium gears ensure smooth operation and extended product lifespan.',
    'smart-display': 'Integrated smart display provides real-time feedback and customizable user interface.'
  };
  
  document.querySelectorAll('.hotspot').forEach(hotspot => {
    hotspot.addEventListener('click', () => {
      const feature = hotspot.dataset.feature;
      featureText.textContent = featureInfo[feature];
      
      // Highlight the active hotspot
      document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('active'));
      hotspot.classList.add('active');
    });
  });
</script>
```

### Interactive Character Customization for Web Games

Create a character builder where users click different body parts to customize their avatar:

```html
<div class="character-builder">
  <img src="character-base.png" class="character-base" />
  <img src="head.png" class="alpha-mask-events part" data-part="head" />
  <img src="torso.png" class="alpha-mask-events part" data-part="torso" />
  <img src="legs.png" class="alpha-mask-events part" data-part="legs" />
  <img src="arms.png" class="alpha-mask-events part" data-part="arms" />
</div>

<div class="customization-panel">
  <h3 id="current-part">Select a body part</h3>
  <div id="options-container"></div>
</div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init({ threshold: 0.85 });
  
  const currentPart = document.getElementById('current-part');
  const optionsContainer = document.getElementById('options-container');
  
  const partOptions = {
    'head': ['head1.png', 'head2.png', 'head3.png'],
    'torso': ['torso1.png', 'torso2.png', 'torso3.png'],
    'legs': ['legs1.png', 'legs2.png', 'legs3.png'],
    'arms': ['arms1.png', 'arms2.png', 'arms3.png']
  };
  
  document.querySelectorAll('.part').forEach(part => {
    part.addEventListener('click', () => {
      const partType = part.dataset.part;
      currentPart.textContent = `Customizing: ${partType.charAt(0).toUpperCase() + partType.slice(1)}`;
      
      // Clear previous options
      optionsContainer.innerHTML = '';
      
      // Create option buttons
      partOptions[partType].forEach(option => {
        const btn = document.createElement('button');
        btn.style.backgroundImage = `url('options/${option}')`;
        btn.classList.add('option-button');
        btn.addEventListener('click', () => {
          part.src = `options/${option}`;
        });
        optionsContainer.appendChild(btn);
      });
    });
  });
</script>
```

### Medical Education Interface

Create interactive anatomical diagrams for medical education:

```html
<div class="anatomy-viewer">
  <img src="human-body.jpg" class="body-image" />
  <img src="heart.png" class="alpha-mask-events organ" data-organ="heart" />
  <img src="lungs.png" class="alpha-mask-events organ" data-organ="lungs" />
  <img src="brain.png" class="alpha-mask-events organ" data-organ="brain" />
  <img src="liver.png" class="alpha-mask-events organ" data-organ="liver" />
</div>

<div class="information-panel">
  <h2 id="organ-name">Select an organ</h2>
  <p id="organ-description">Click on an organ to view detailed information</p>
  <div id="related-conditions"></div>
</div>

<script>
  import AME from 'alpha-mask-events';
  
  AME.init({ threshold: 0.9 });
  
  const organName = document.getElementById('organ-name');
  const organDesc = document.getElementById('organ-description');
  const relatedConditions = document.getElementById('related-conditions');
  
  const organData = {
    'heart': {
      name: 'Heart',
      description: 'The heart is a muscular organ that pumps blood through the blood vessels of the circulatory system.',
      conditions: ['Coronary artery disease', 'Heart failure', 'Arrhythmias']
    },
    'lungs': {
      name: 'Lungs',
      description: 'The lungs are the primary organs of respiration, responsible for taking in oxygen and expelling carbon dioxide.',
      conditions: ['Asthma', 'COPD', 'Pneumonia']
    },
    'brain': {
      name: 'Brain',
      description: 'The brain is the center of the nervous system, controlling thought, memory, and coordinating body functions.',
      conditions: ['Stroke', 'Alzheimer\'s disease', 'Epilepsy']
    },
    'liver': {
      name: 'Liver',
      description: 'The liver plays a vital role in metabolism and detoxification of various metabolites.',
      conditions: ['Hepatitis', 'Cirrhosis', 'Fatty liver disease']
    }
  };
  
  document.querySelectorAll('.organ').forEach(organ => {
    organ.addEventListener('click', () => {
      const organId = organ.dataset.organ;
      const data = organData[organId];
      
      organName.textContent = data.name;
      organDesc.textContent = data.description;
      
      relatedConditions.innerHTML = '<h3>Related Conditions</h3>';
      const list = document.createElement('ul');
      data.conditions.forEach(condition => {
        const item = document.createElement('li');
        item.textContent = condition;
        list.appendChild(item);
      });
      relatedConditions.appendChild(list);
      
      // Highlight the active organ
      document.querySelectorAll('.organ').forEach(o => o.classList.remove('active'));
      organ.classList.add('active');
    });
  });
</script>
``` 