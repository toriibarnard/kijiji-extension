// common.js - Shared functions for extracting Kijiji listing data

// Extract listing data from Kijiji vehicle page
function extractListingData() {
  console.log("Starting Kijiji data extraction");
  
  // Initialize with empty values
  const data = {
    title: "N/A",
    price: "N/A",
    location: "N/A",
    datePosted: "N/A",
    sellerName: "N/A",
    mileage: "N/A",
    url: window.location.href,
    year: "N/A",
    make: "N/A",
    model: "N/A",
    transmission: "N/A",
    bodyType: "N/A",
    colour: "N/A",
    drivetrain: "N/A"
  };
  
  try {
    // EXTRACT TITLE
    // Kijiji usually has the title in an h1 tag with specific attributes
    const titleElement = document.querySelector('h1[itemprop="name"]') || 
                        document.querySelector('h1[class*="title"]') ||
                        document.querySelector('h1');
    
    if (titleElement) {
      data.title = titleElement.textContent.trim();
      console.log("Found title:", data.title);
      
      // Try to extract year, make, model from title
      const yearMatch = data.title.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        data.year = yearMatch[0];
        
        // Extract make/model after year
        const afterYear = data.title.substring(data.title.indexOf(data.year) + 4).trim();
        const parts = afterYear.split(' ');
        if (parts.length > 0) {
          data.make = parts[0];
          if (parts.length > 1) {
            // Join remaining parts as model (excluding common suffixes)
            const modelParts = parts.slice(1).filter(part => 
              !['sedan', 'suv', 'truck', 'coupe', 'hatchback'].includes(part.toLowerCase())
            );
            data.model = modelParts.join(' ');
          }
        }
      }
    }
    
    // EXTRACT PRICE
    // Kijiji typically has price in a specific span or div with class containing "price"
    const priceElement = document.querySelector('[itemprop="price"]') ||
                        document.querySelector('[class*="currentPrice"]') ||
                        document.querySelector('[class*="price-amount"]') ||
                        document.querySelector('span[class*="price"]');
    
    if (priceElement) {
      // Get the content attribute if it exists (cleaner price value)
      const priceContent = priceElement.getAttribute('content');
      if (priceContent) {
        data.price = `$${parseFloat(priceContent).toLocaleString()}`;
      } else {
        data.price = priceElement.textContent.trim();
      }
      console.log("Found price:", data.price);
    }
    
    // EXTRACT LOCATION
    // Kijiji shows location in address tags or specific location divs
    const locationElement = document.querySelector('address') ||
                           document.querySelector('[itemprop="address"]') ||
                           document.querySelector('[class*="location"]') ||
                           document.querySelector('svg[aria-label="Location"] + span');
    
    if (locationElement) {
      data.location = locationElement.textContent.trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .split('\n')[0];       // Take first line if multiple
      console.log("Found location:", data.location);
    }
    
    // EXTRACT DATE POSTED
    // Look for posted date information
    const dateElement = document.querySelector('time[itemprop="datePosted"]') ||
                       document.querySelector('[class*="datePosted"]') ||
                       document.querySelector('time');
    
    if (dateElement) {
      const dateTime = dateElement.getAttribute('datetime');
      if (dateTime) {
        // Format the date nicely
        const date = new Date(dateTime);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          data.datePosted = "Today";
        } else if (diffDays === 1) {
          data.datePosted = "Yesterday";
        } else if (diffDays < 7) {
          data.datePosted = `${diffDays} days ago`;
        } else {
          data.datePosted = date.toLocaleDateString();
        }
      } else {
        data.datePosted = dateElement.textContent.trim();
      }
      console.log("Found date:", data.datePosted);
    }
    
    // EXTRACT VEHICLE ATTRIBUTES
    // Kijiji usually has a list of attributes with labels and values
    const attributeContainers = document.querySelectorAll('dl[class*="attribute"], li[class*="attribute"], div[class*="attribute-list"] > div');
    
    attributeContainers.forEach(container => {
      // Look for dt/dd pairs or label/value patterns
      const labels = container.querySelectorAll('dt, [class*="label"], span:first-child');
      const values = container.querySelectorAll('dd, [class*="value"], span:last-child');
      
      labels.forEach((label, index) => {
        if (values[index]) {
          const labelText = label.textContent.trim().toLowerCase();
          const valueText = values[index].textContent.trim();
          
          // Map Kijiji labels to our data structure
          if (labelText.includes('kilometre') || labelText.includes('mileage')) {
            data.mileage = valueText;
          } else if (labelText.includes('make')) {
            data.make = valueText;
          } else if (labelText.includes('model')) {
            data.model = valueText;
          } else if (labelText.includes('year')) {
            data.year = valueText;
          } else if (labelText.includes('transmission')) {
            data.transmission = valueText;
          } else if (labelText.includes('body type') || labelText.includes('type')) {
            data.bodyType = valueText;
          } else if (labelText.includes('colour') || labelText.includes('color')) {
            data.colour = valueText;
          } else if (labelText.includes('drivetrain')) {
            data.drivetrain = valueText;
          }
        }
      });
    });
    
    // Alternative approach for attributes in table format
    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const label = cells[0].textContent.trim().toLowerCase();
        const value = cells[1].textContent.trim();
        
        if (label.includes('kilometre') || label.includes('mileage')) {
          data.mileage = value;
        } else if (label.includes('make') && data.make === "N/A") {
          data.make = value;
        } else if (label.includes('model') && data.model === "N/A") {
          data.model = value;
        } else if (label.includes('year') && data.year === "N/A") {
          data.year = value;
        } else if (label.includes('transmission')) {
          data.transmission = value;
        } else if (label.includes('body type')) {
          data.bodyType = value;
        } else if (label.includes('colour') || label.includes('color')) {
          data.colour = value;
        } else if (label.includes('drivetrain')) {
          data.drivetrain = value;
        }
      }
    });
    
    // EXTRACT SELLER NAME
    // Kijiji shows seller info in profile sections
    const sellerElement = document.querySelector('[class*="profile-name"]') ||
                         document.querySelector('[class*="seller-name"]') ||
                         document.querySelector('div[class*="profile"] h3') ||
                         document.querySelector('a[href*="/u/"] span');
    
    if (sellerElement) {
      data.sellerName = sellerElement.textContent.trim();
      console.log("Found seller:", data.sellerName);
    }
    
    // Try alternative seller extraction from "Contact" or "Seller" sections
    if (data.sellerName === "N/A") {
      const sellerSections = Array.from(document.querySelectorAll('h2, h3, h4'))
        .filter(h => h.textContent.toLowerCase().includes('seller') || 
                    h.textContent.toLowerCase().includes('contact'));
      
      sellerSections.forEach(section => {
        if (data.sellerName !== "N/A") return;
        
        // Look for text after this heading
        let nextElement = section.nextElementSibling;
        let attempts = 0;
        
        while (nextElement && attempts < 5) {
          const text = nextElement.textContent.trim();
          // Check if it looks like a name (not a button, not too long)
          if (text && 
              text.length > 2 && 
              text.length < 50 && 
              !text.toLowerCase().includes('message') &&
              !text.toLowerCase().includes('call') &&
              !text.toLowerCase().includes('email') &&
              /^[A-Za-z\s\.\-']+$/.test(text)) {
            data.sellerName = text;
            break;
          }
          nextElement = nextElement.nextElementSibling;
          attempts++;
        }
      });
    }
    
  } catch (error) {
    console.error("Error during extraction:", error);
  }
  
  // Final validation and logging
  console.log("Final extracted data:", data);
  return data;
}

// Function for any additional helper functions
function normalizePrice(priceText) {
  // Remove currency symbols and convert to number
  const price = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
  return parseFloat(price);
}
