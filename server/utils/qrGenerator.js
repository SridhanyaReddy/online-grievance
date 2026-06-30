const QRCode = require('qrcode');

/**
 * Generate Base64 Data URL for a QR Code
 * @param {string} text 
 */
const generateQRCode = async (text) => {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      color: {
        dark: '#1e293b', // Sleek slate color
        light: '#ffffff'
      },
      width: 250,
      margin: 2
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    return '';
  }
};

module.exports = { generateQRCode };
