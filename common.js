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
    transmission: "N/A",
    bodyType: "N/A",
    colour: "N/A",
    drivetrain: "N/A",
    condition: "N/A",
    seats: "N/A",
    fuel: "N/A"
  };
  
  try {
    // EXTRACT TITLE - From the h1 at top of page
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      data.title = titleElement.textContent.trim();
      console.log("Found title:", data.title);
    }
    
    // EXTRACT PRICE - Look for the price display (usually has $ symbol)
    const priceElements = document.querySelectorAll('*');
    for (const el of priceElements) {
      const text = el.textContent.trim();
      // Match price format like $15,995
      if (/^\$[\d,]+$/.test(text) && el.childElementCount === 0) {
        data.price = text;
        console.log("Found price:", data.price);
        break;
      }
    }
    
    // EXTRACT DATE POSTED - Look for "Posted X min/hr/day ago"
    // Be more specific to avoid capturing JSON-LD data
    const postedElements = Array.from(document.querySelectorAll('span, div, p'))
      .filter(el => {
        const text = el.textContent.trim();
        // Make sure it's not too long (to avoid JSON data) and matches the pattern
        return text.length < 50 && 
               /^Posted\s+\d+\s+(min|mins|hr|hrs|hour|hours|day|days)\s+ago$/i.test(text);
      });
    
    if (postedElements.length > 0) {
      data.datePosted = postedElements[0].textContent.trim();
      console.log("Found date posted:", data.datePosted);
    }
    
    // EXTRACT LOCATION - Look for text ending with postal code OR ", NS" pattern
    // NS postal codes: B + digit + letter + space + digit + letter + digit
    const nsPostalCodePattern = /B\d[A-Z]\s*\d[A-Z]\d/;
    
    // Find all text elements
    const allTextElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.childElementCount === 0 && el.textContent.trim());
    
    for (const el of allTextElements) {
      const text = el.textContent.trim();
      
      // Check if text ends with NS postal code
      const postalMatch = text.match(/(.*?)(B\d[A-Z]\s*\d[A-Z]\d)\s*$/);
      if (postalMatch && text.length < 200) {
        data.location = text;
        console.log("Found location ending with postal code:", data.location);
        break;
      }
      
      // Check if text ends with ", NS" (for locations without postal code)
      if (text.endsWith(', NS') && text.length < 100) {
        data.location = text;
        console.log("Found location ending with , NS:", data.location);
        break;
      }
      
      // Check for common Halifax area locations
      const halifaxPattern = /, (Halifax|Dartmouth|Bedford|Lower Sackville|Cole Harbour|Spryfield|Clayton Park|Fairview|Hammonds Plains)$/i;
      if (halifaxPattern.test(text) && text.length < 100) {
        data.location = text;
        console.log("Found Halifax area location:", data.location);
        break;
      }
    }
    
    // EXTRACT SELLER NAME - Multiple strategies
    
    // Strategy 1: Look for "Listed By" section
    const listedByElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.trim() === 'Listed By');
    
    if (listedByElements.length > 0) {
      console.log("Found 'Listed By' section");
      const listedByEl = listedByElements[0];
      
      // Look for the next text element after "Listed By"
      let nextElement = listedByEl.nextElementSibling;
      let attempts = 0;
      
      while (nextElement && attempts < 10) {
        // Skip if it's a container with many children
        if (nextElement.childElementCount > 3) {
          nextElement = nextElement.nextElementSibling;
          attempts++;
          continue;
        }
        
        const text = nextElement.textContent.trim();
        
        // Check if this looks like a name (not "Owner" or other labels)
        if (text && 
            text.length >= 2 && 
            text.length < 100 && 
            text !== 'Owner' &&
            text !== 'Dealer' &&
            !text.includes('View all listings') &&
            !text.includes('★')) {
          
          data.sellerName = text;
          console.log("Found seller name in Listed By section:", data.sellerName);
          break;
        }
        
        // Also check children of this element
        const childTexts = Array.from(nextElement.querySelectorAll('*'))
          .filter(el => el.childElementCount === 0)
          .map(el => el.textContent.trim())
          .filter(text => text && text.length >= 2 && text.length < 100);
        
        if (childTexts.length > 0) {
          data.sellerName = childTexts[0];
          console.log("Found seller name in Listed By children:", data.sellerName);
          break;
        }
        
        nextElement = nextElement.nextElementSibling;
        attempts++;
      }
    }
    
    // Strategy 2: Look for the prominent text before rating numbers (in the top right section)
    if (data.sellerName === "N/A") {
      const ratingNumberPattern = /^\d+\.\d+$/; // Matches 4.3
      const reviewCountPattern = /^\(\d+\)$/;   // Matches (925)
      
      // Find elements with ratings
      const ratingElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const text = el.textContent.trim();
          return (ratingNumberPattern.test(text) || reviewCountPattern.test(text)) && 
                 el.childElementCount === 0;
        });
      
      console.log("Found rating elements:", ratingElements.length);
      
      for (const ratingEl of ratingElements) {
        if (data.sellerName !== "N/A") break;
        
        // Look at previous siblings
        let prevElement = ratingEl.previousElementSibling;
        let attempts = 0;
        
        while (prevElement && attempts < 5) {
          const text = prevElement.textContent.trim();
          
          // Check if this could be a seller name
          if (text && 
              text.length >= 2 && 
              text.length < 100 && 
              !text.includes('★') &&
              !text.includes('Google') &&
              !text.includes('reviews') &&
              !text.includes('Website') &&
              !ratingNumberPattern.test(text) &&
              !reviewCountPattern.test(text)) {
            
            data.sellerName = text;
            console.log("Found seller name before rating:", data.sellerName);
            break;
          }
          
          prevElement = prevElement.previousElementSibling;
          attempts++;
        }
        
        // If not found in siblings, check parent and look for text before this rating
        if (data.sellerName === "N/A") {
          const parent = ratingEl.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children);
            const ratingIndex = siblings.indexOf(ratingEl);
            
            // Look at elements before the rating
            for (let i = ratingIndex - 1; i >= 0 && i >= ratingIndex - 5; i--) {
              const text = siblings[i].textContent.trim();
              
              if (text && 
                  text.length >= 2 && 
                  text.length < 100 && 
                  !text.includes('★') &&
                  !text.includes('Google') &&
                  !text.includes('reviews') &&
                  !ratingNumberPattern.test(text) &&
                  !reviewCountPattern.test(text)) {
                
                data.sellerName = text;
                console.log("Found seller name in parent before rating:", data.sellerName);
                break;
              }
            }
          }
        }
      }
    }
    
    // Strategy 3: Look for Google reviews text and find what's above it
    if (data.sellerName === "N/A") {
      const googleElements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent.trim() === 'Google reviews');
      
      if (googleElements.length > 0) {
        const googleEl = googleElements[0];
        const parent = googleEl.parentElement;
        
        if (parent) {
          // Get all child elements
          const children = Array.from(parent.children);
          const googleIndex = children.indexOf(googleEl);
          
          // Look backwards from Google reviews
          for (let i = googleIndex - 1; i >= 0 && i >= googleIndex - 10; i--) {
            const text = children[i].textContent.trim();
            
            // Skip rating numbers and review counts
            if (/^\d+\.\d+$/.test(text) || /^\(\d+\)$/.test(text)) continue;
            
            // If we find text that's not a rating, it's likely the seller name
            if (text && text.length >= 2 && text.length < 100) {
              data.sellerName = text;
              console.log("Found seller name before Google reviews:", data.sellerName);
              break;
            }
          }
        }
      }
    }
    
    // EXTRACT VEHICLE ATTRIBUTES
    // Look for the attributes list with icons and category/value pairs
    
    // Method 1: Look for elements with specific icons followed by text
    const iconMappings = {
      'Condition': ['condition'],
      'Kilometres': ['mileage', 'kilometres'],
      'Seats': ['seats'],
      'Body Style': ['bodyType', 'body style'],
      'Transmission': ['transmission'],
      'Colour': ['colour', 'color'],
      'Drivetrain': ['drivetrain'],
      'Fuel': ['fuel']
    };
    
    // Find all list items that might contain attributes
    const attributeItems = document.querySelectorAll('li, div[class*="attribute"]');
    
    attributeItems.forEach(item => {
      const text = item.textContent.trim();
      
      // Check each known category
      for (const [category, keywords] of Object.entries(iconMappings)) {
        for (const keyword of keywords) {
          if (text.toLowerCase().includes(keyword.toLowerCase())) {
            // Extract the value after the category name
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            
            if (lines.length >= 2) {
              const categoryLine = lines.find(line => line.toLowerCase().includes(keyword.toLowerCase()));
              const categoryIndex = lines.indexOf(categoryLine);
              
              if (categoryIndex !== -1 && categoryIndex < lines.length - 1) {
                const value = lines[categoryIndex + 1];
                
                switch(category) {
                  case 'Condition':
                    data.condition = value;
                    break;
                  case 'Kilometres':
                    data.mileage = value;
                    break;
                  case 'Seats':
                    data.seats = value;
                    break;
                  case 'Body Style':
                    data.bodyType = value;
                    break;
                  case 'Transmission':
                    data.transmission = value;
                    break;
                  case 'Colour':
                    data.colour = value;
                    break;
                  case 'Drivetrain':
                    data.drivetrain = value;
                    break;
                  case 'Fuel':
                    data.fuel = value;
                    break;
                }
                console.log(`Found ${category}: ${value}`);
                break;
              }
            }
          }
        }
      }
    });
    
    // Method 2: Try pattern matching on the page text as fallback
    if (data.mileage === "N/A" || data.condition === "N/A") {
      const bodyText = document.body.innerText;
      
      // Look for patterns like "Condition\nUsed"
      const conditionMatch = bodyText.match(/Condition\s*\n\s*([^\n]+)/i);
      if (conditionMatch) {
        data.condition = conditionMatch[1].trim();
        console.log("Found condition (pattern):", data.condition);
      }
      
      // Look for patterns like "Kilometres\n140,426"
      const kmMatch = bodyText.match(/Kilometres?\s*\n\s*([\d,]+)/i);
      if (kmMatch) {
        data.mileage = kmMatch[1].trim();
        console.log("Found kilometres (pattern):", data.mileage);
      }
      
      // Similar patterns for other fields
      const patternsToMatch = [
        { pattern: /Seats\s*\n\s*([^\n]+)/i, field: 'seats' },
        { pattern: /Body Style\s*\n\s*([^\n]+)/i, field: 'bodyType' },
        { pattern: /Transmission\s*\n\s*([^\n]+)/i, field: 'transmission' },
        { pattern: /Drivetrain\s*\n\s*([^\n]+)/i, field: 'drivetrain' },
        { pattern: /Fuel\s*\n\s*([^\n]+)/i, field: 'fuel' },
        { pattern: /Colou?r\s*\n\s*([^\n]+)/i, field: 'colour' }
      ];
      
      patternsToMatch.forEach(({ pattern, field }) => {
        if (data[field] === "N/A") {
          const match = bodyText.match(pattern);
          if (match) {
            data[field] = match[1].trim();
            console.log(`Found ${field} (pattern):`, data[field]);
          }
        }
      });
    }
    
  } catch (error) {
    console.error("Error during extraction:", error);
  }
  
  // Truncate any fields that are too long for Excel (32767 character limit)
  const maxLength = 32000; // Leave some buffer
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string' && data[key].length > maxLength) {
      console.warn(`Field ${key} exceeded Excel limit, truncating from ${data[key].length} to ${maxLength} characters`);
      data[key] = data[key].substring(0, maxLength) + '...';
    }
  });
  
  // Final validation and logging
  console.log("Final extracted data:", data);
  return data;
}