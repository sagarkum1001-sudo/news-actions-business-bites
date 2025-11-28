export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  // Basic URL validation
  try {
    const urlObj = new URL(url);
    // Only allow HTTPS to prevent mixed content
    if (urlObj.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    console.log(`🖼️ Proxying image: ${url}`);

    // Fetch the image
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsActions/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error(`❌ Image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    const contentType = imageResponse.headers.get('content-type');
    const contentLength = imageResponse.headers.get('content-length');

    // Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`❌ Invalid content type: ${contentType}`);
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // For large images, stream the response
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // > 1MB
      console.log(`📊 Streaming large image: ${contentLength} bytes`);
      imageResponse.body.pipe(res);
    } else {
      // For smaller images, buffer and send
      const buffer = await imageResponse.arrayBuffer();
      console.log(`📊 Sending buffered image: ${buffer.byteLength} bytes`);
      res.send(Buffer.from(buffer));
    }

  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image', details: error.message });
  }
}
