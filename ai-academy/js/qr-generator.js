// QR Code Generator for AESOP Assessment
// Generates QR codes encoding learner ID + optional recovery token
// Uses qrcode.js library (CDN)

// QR code library loaded via CDN in HTML
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

/**
 * Generate QR code for learner ID recovery
 * @param {string} learnerId - UUID of the learner
 * @param {string} recoveryToken - Optional recovery token (if not provided, uses learnerId)
 * @param {Object} options - Optional configuration
 * @returns {Promise<{svg: string, dataUrl: string, errorMessage?: string}>}
 */
export async function generateQRCode(learnerId, recoveryToken = null, options = {}) {
  try {
    // Data to encode: learner ID + recovery token (if present)
    const data = recoveryToken
      ? `${learnerId}|${recoveryToken}`
      : learnerId;

    // Validate input
    if (!learnerId || learnerId.trim().length === 0) {
      throw new Error('Learner ID is required');
    }

    if (data.length > 2953) { // QR code limit
      throw new Error('Data too long for QR code');
    }

    // Generate QR code using qrcode.js
    return await generateQRCodeWithQRJS(data, options);

  } catch (error) {
    console.error('QR generation failed:', error);
    return {
      svg: '',
      dataUrl: '',
      errorMessage: error.message || 'Failed to generate QR code'
    };
  }
}

/**
 * Generate QR code using qrcode.js library
 * @private
 */
async function generateQRCodeWithQRJS(data, options = {}) {
  return new Promise((resolve) => {
    try {
      // Check if QRCode library is loaded
      if (typeof QRCode === 'undefined') {
        throw new Error('QRCode library not loaded. Include <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');
      }

      const {
        size = 256,
        margin = 10,
        colorDark = '#000000',
        colorLight = '#FFFFFF'
      } = options;

      // Create temporary container
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      // Generate QR code
      const qr = new QRCode(container, {
        text: data,
        width: size,
        height: size,
        colorDark,
        colorLight,
        correctLevel: QRCode.CorrectLevel.H,
      });

      // Wait for generation to complete
      setTimeout(() => {
        try {
          // Get SVG from rendered QR code
          const canvas = container.querySelector('canvas');
          const img = container.querySelector('img');

          let svg = '';
          let dataUrl = '';

          if (canvas) {
            // Convert canvas to data URL
            dataUrl = canvas.toDataURL('image/png');
            svg = canvasToSVG(canvas);
          } else if (img) {
            dataUrl = img.src;
          }

          // Cleanup
          document.body.removeChild(container);

          resolve({
            svg: svg || dataUrl,
            dataUrl,
            errorMessage: null
          });
        } catch (err) {
          document.body.removeChild(container);
          resolve({
            svg: '',
            dataUrl: '',
            errorMessage: err.message
          });
        }
      }, 100);

    } catch (error) {
      resolve({
        svg: '',
        dataUrl: '',
        errorMessage: error.message
      });
    }
  });
}

/**
 * Convert canvas QR code to SVG string
 * Fallback approach: returns canvas as PNG data URL wrapped in SVG
 * @private
 */
function canvasToSVG(canvas) {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const width = canvas.width;
    const height = canvas.height;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <image href="${dataUrl}" width="${width}" height="${height}"/>
    </svg>`;
  } catch (err) {
    return '';
  }
}

/**
 * Display QR code in DOM element
 * @param {string} elementId - ID of container element
 * @param {string} qrDataUrl - Data URL from generateQRCode
 * @param {Object} options - Display options
 */
export function displayQRCode(elementId, qrDataUrl, options = {}) {
  try {
    const container = document.getElementById(elementId);
    if (!container) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const {
      width = '256px',
      height = '256px',
      margin = '10px',
      showLabel = true,
      label = 'Scan to recover your learner ID'
    } = options;

    // Clear container
    container.innerHTML = '';

    // Create QR code display
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      text-align: center;
      padding: ${margin};
      background: white;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
    `;

    const img = document.createElement('img');
    img.src = qrDataUrl;
    img.alt = 'Recovery QR Code';
    img.style.cssText = `
      width: ${width};
      height: ${height};
      display: block;
      margin: 0 auto;
    `;

    wrapper.appendChild(img);

    if (showLabel) {
      const labelEl = document.createElement('p');
      labelEl.textContent = label;
      labelEl.style.cssText = `
        margin: 12px 0 0 0;
        font-size: 12px;
        color: #666;
      `;
      wrapper.appendChild(labelEl);
    }

    container.appendChild(wrapper);
    return true;

  } catch (error) {
    console.error('Failed to display QR code:', error);
    return false;
  }
}
