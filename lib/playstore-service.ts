export interface PlayStoreGame {
  id: string
  name: string
  summary?: string
  coverUrl?: string
  rating?: number
  ratingCount?: number
  category?: string
  developer?: string
  price?: string
  installs?: string
}

export async function getPopularPlayStoreGames(limit = 200): Promise<PlayStoreGame[]> {
  try {
    console.log('🎮 Fetching Play Store games from OpenWebNinja...')
    
    const apiKey = 'ak_czy83xymgi5xfktql0azraq00u9jnl9hr661hx4ekx7s66y'
    
    const response = await fetch(
      `https://api.openwebninja.com/play-store-apps/top-free-games?limit=${limit}&region=TH&language=EN`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    )

    console.log(`📊 Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText.slice(0, 200))
      throw new Error(`API returned ${response.status}: ${errorText.slice(0, 100)}`)
    }

    const contentType = response.headers.get('content-type')
    console.log(`📦 Content-Type: ${contentType}`)
    
    if (!contentType?.includes('application/json')) {
      const text = await response.text()
      console.error('❌ Response is not JSON:', text.slice(0, 200))
      throw new Error('API did not return JSON')
    }

    const data = await response.json()
    console.log('📦 API Response structure:', Object.keys(data))
    
    // Log sample of response
    if (data) {
      console.log('📦 Sample response:', JSON.stringify(data).slice(0, 500))
    }
    
    // Handle different possible response structures
    let apps = data.data || data.apps || data.results || (Array.isArray(data) ? data : [])
    
    // If apps is not an array, try to find array in the response
    if (!Array.isArray(apps)) {
      console.log('⚠️ Apps is not array, checking nested structure...')
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          apps = data[key]
          console.log(`✅ Found array at key: ${key}`)
          break
        }
      }
    }
    
    if (!Array.isArray(apps) || apps.length === 0) {
      console.error('❌ No apps array found in response')
      console.error('Response structure:', JSON.stringify(data).slice(0, 1000))
      throw new Error('No apps found in API response')
    }

    console.log(`📱 Found ${apps.length} apps in response`)
    
    // Log first app structure
    if (apps[0]) {
      console.log('🎮 First app structure:', Object.keys(apps[0]))
      console.log('🎮 First app sample:', JSON.stringify(apps[0]).slice(0, 300))
    }

    const games = apps.slice(0, limit).map((app: any, index: number) => {
      // Log full app object for first 3 games
      if (index < 3) {
        console.log(`🎮 Game ${index} full data:`, JSON.stringify(app, null, 2))
      }
      
      const game = {
        id: app.app_id || app.appId || app.id || app.package_name || app.packageName || `game-${index}`,
        name: app.app_name || app.title || app.name || app.appName || app.displayName || 'Unknown Game',
        summary: app.app_description || app.summary || app.description || app.shortDescription || app.descriptionHTML || '',
        coverUrl: app.app_icon || app.icon || app.iconUrl || app.image || app.thumbnail || app.headerImage || app.logo || '',
        rating: parseFloat(app.rating || app.score || app.averageRating || app.scoreText || '0') || undefined,
        ratingCount: parseInt(String(app.num_ratings || app.ratings || app.ratingCount || app.numReviews || app.reviews || '0').replace(/[^0-9]/g, '')) || undefined,
        category: app.app_category || app.genre || app.category || app.genreId || app.categoryId || app.primaryGenre || 'Game',
        developer: app.app_developer || app.developer || app.developerId || app.developerName || app.developerAddress || app.author || '',
        price: app.price || app.priceText || (app.is_paid ? 'Paid' : app.free === false ? 'Paid' : app.isFree === false ? 'Paid' : 'Free'),
        installs: app.num_downloads || app.installs || app.minInstalls || app.maxInstalls || app.downloads || '',
      }
      
      // Log parsed game for first 3
      if (index < 3) {
        console.log(`✅ Game ${index} parsed:`, game)
      }
      
      // Log if missing critical fields
      if (!game.name || game.name === 'Unknown Game') {
        console.warn(`⚠️ Game ${index} missing name. Available fields:`, Object.keys(app))
      }
      if (!game.coverUrl) {
        console.warn(`⚠️ Game ${index} missing icon. Available fields:`, Object.keys(app))
      }
      
      return game
    }).filter((game: PlayStoreGame) => game.id && game.name)

    console.log(`✅ Successfully mapped ${games.length} Play Store games`)
    
    // Log how many have images
    const gamesWithImages = games.filter(g => g.coverUrl).length
    console.log(`🖼️ Games with images: ${gamesWithImages}/${games.length}`)
    
    return games
  } catch (error) {
    console.error('❌ Error fetching Play Store games:', error)
    throw error
  }
}
