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
    
    // EXTRACT SELLER NAME AND LOCATION - From the right side panel
    // Look for the section that contains Google reviews - that's usually where the seller name is
    const googleReviewsElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent.includes('Google reviews'));
    
    if (googleReviewsElements.length > 0) {
      // Get the parent container that has the seller info
      let sellerContainer = googleReviewsElements[0];
      
      // Go up a few levels to find the container
      for (let i = 0; i < 5 && sellerContainer; i++) {
        sellerContainer = sellerContainer.parentElement;
        if (!sellerContainer) break;
        
        // Look for seller name - it's usually in a heading before "Google reviews"
        const headings = sellerContainer.querySelectorAll('h2, h3, h4');
        for (const heading of headings) {
          const text = heading.textContent.trim();
          // Make sure it's not the Google reviews text itself
          if (text && !text.includes('Google reviews') && !text.includes('(') && text.length > 2) {
            data.sellerName = text;
            console.log("Found seller name near Google reviews:", data.sellerName);
            break;
          }
        }
        
        // If we found the seller name, stop looking
        if (data.sellerName !== "N/A") break;
      }
    }
    
    // Alternative method to find seller name - look for text right before rating stars
    if (data.sellerName === "N/A") {
      const ratingElements = document.querySelectorAll('[class*="rating"], [aria-label*="rating"]');
      ratingElements.forEach(el => {
        if (data.sellerName !== "N/A") return;
        
        // Look at previous siblings
        let prevSibling = el.previousElementSibling;
        let attempts = 0;
        while (prevSibling && attempts < 3) {
          const text = prevSibling.textContent.trim();
          if (text && text.length > 2 && text.length < 100 && !text.includes('Google') && !text.includes('reviews')) {
            data.sellerName = text;
            console.log("Found seller name before rating:", data.sellerName);
            break;
          }
          prevSibling = prevSibling.previousElementSibling;
          attempts++;
        }
      });
    }
    
    // EXTRACT LOCATION - Look for address pattern
    // Look for text that matches address format with street number, name, city, province, postal code
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:Drive|Dr|Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Court|Ct|Place|Pl|Way),?\s*[A-Za-z\s]+,?\s*NS,?\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d/;
    
    // Search in the whole document
    const allText = document.body.innerText;
    const addressMatch = allText.match(addressPattern);
    if (addressMatch) {
      data.location = addressMatch[0].trim();
      console.log("Found location (full address):", data.location);
    }
    
    // Alternative: Look near the seller info
    if (data.location === "N/A" && googleReviewsElements.length > 0) {
      let searchContainer = googleReviewsElements[0];
      for (let i = 0; i < 5 && searchContainer; i++) {
        searchContainer = searchContainer.parentElement;
        if (!searchContainer) break;
        
        const containerText = searchContainer.textContent;
        const localAddressMatch = containerText.match(addressPattern);
        if (localAddressMatch) {
          data.location = localAddressMatch[0].trim();
          console.log("Found location near seller info:", data.location);
          break;
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