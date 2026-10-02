package ventana

import "math"

const earthRadiusKm = 6371.0

type Point struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

func (p Point) valid() bool {
	return p.Lat >= -85 && p.Lat <= 85 && p.Lng >= -180 && p.Lng <= 180
}

type Area struct {
	Center   Point   `json:"center"`
	RadiusKm float64 `json:"radiusKm"`
}

func (a Area) contains(p Point) bool {
	return distanceKm(a.Center, p) <= a.RadiusKm
}

func distanceKm(a, b Point) float64 {
	lat1, lat2 := radians(a.Lat), radians(b.Lat)
	dLat, dLng := lat2-lat1, radians(b.Lng-a.Lng)
	h := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusKm * math.Asin(math.Sqrt(h))
}

func offset(p Point, distKm, bearingRad float64) Point {
	dLat := distKm * math.Cos(bearingRad) / 111.32
	dLng := distKm * math.Sin(bearingRad) / (111.32 * math.Cos(radians(p.Lat)))
	return Point{Lat: p.Lat + dLat, Lng: p.Lng + dLng}
}

func radians(deg float64) float64 { return deg * math.Pi / 180 }
