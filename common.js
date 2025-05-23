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
    const postedElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.includes('Posted') && el.textContent.includes('ago'));
    
    if (postedElements.length > 0) {
      const postedText = postedElements[0].textContent.trim();
      if (/Posted\s+\d+\s+(min|hr|hrs|hour|hours|day|days)\s+ago/i.test(postedText)) {
        data.datePosted = postedText;
        console.log("Found date posted:", data.datePosted);
      }
    }
    
    // EXTRACT SELLER NAME - From the right side panel
    // Look for business name or person name in seller info section
    const sellerSection = document.querySelector('aside') || document.querySelector('[class*="seller"]');
    if (sellerSection) {
      // Look for a heading or prominent text that could be seller name
      const headings = sellerSection.querySelectorAll('h2, h3, h4, a[href*="/u/"]');
      for (const heading of headings) {
        const text = heading.textContent.trim();
        // Check if it looks like a business or person name
        if (text && !text.includes('Google reviews') && !text.includes('Website')) {
          data.sellerName = text;
          console.log("Found seller name:", data.sellerName);
          break;
        }
      }
      
      // Extract location - look for postal code pattern
      const locationMatch = sellerSection.textContent.match(/([A-Z]{2}-\d+),?\s*([^,]+),?\s*([A-Z]\d[A-Z]\s*\d[A-Z]\d)/);
      if (locationMatch) {
        data.location = `${locationMatch[1]}, ${locationMatch[2]}, ${locationMatch[3]}`;
        console.log("Found location:", data.location);
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
      'Fuel': ['fuel'],
      'Model': ['model']
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
                  case 'Model':
                    // Just store the full model string, don't parse it
                    data.model = value;
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
        { pattern: /Colou?r\s*\n\s*([^\n]+)/i, field: 'colour' },
        { pattern: /Model\s*\n\s*([^\n]+)/i, field: 'model' }
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
  
  // Final validation and logging
  console.log("Final extracted data:", data);
  return data;
}