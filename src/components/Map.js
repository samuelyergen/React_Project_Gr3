import React, {useEffect, useState} from "react";
import {MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents} from "react-leaflet";
import {Link, Route} from "react-router-dom";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import L from "leaflet";
import {firebase} from "../initFirebase";
import {useAuth} from "../context/AuthContext";
import {Text} from "../context/Language";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});

// Get the DB object from the firebase app
const db = firebase.firestore();
const COLLECTION_USERS = "users";

//display the route from a gpx file
function Map(props) {

    let fileReader;
    const [mapPosition, setMapPosition] = useState([])

    const [currentPosition, setCurrentPosition] = useState([0, 0])

    const [gpxString, setGpxString] = useState('')

    const [gpxRoute, setGpxRoute] = useState([])

    const {isAdmin} = useAuth();

    useEffect(() => {
        getGpxRoute();
    }, []);

    const handleReading = (e) => {
        const text = e.target.result;
        parseFile(text)
        setGpxString(text)
    }

    const addRoute = async () => {
        const currentUser = firebase.auth().currentUser
        const userId = currentUser.uid

        const usersCollection = await db.collection(COLLECTION_USERS).doc(userId)
        if (gpxString !== ('')) {
            await usersCollection.update({
                gpxs: firebase.firestore.FieldValue.arrayUnion(gpxString)
            })
            await getGpxRoute();
        }
    }

    const getGpxParse = (gpxInString) => {
        let gpxParser = require('gpxparser');
        let gpx = new gpxParser();
        gpx.parse(gpxInString)
        return gpx;
    }

    const getGpxRoute = async () => {
        try {
            const currentUser = firebase.auth().currentUser;
            const userId = currentUser.uid;

            const getFromFirebase = db.collection(COLLECTION_USERS).doc(userId);
            await getFromFirebase.get().then((doc) => {
                let gpxParsed = [];
                let gpxData = doc.data().gpxs
                if (gpxData.length !== 0) {
                    gpxData.forEach(data => {
                            let parsedGpx = getGpxParse(data)
                            gpxParsed.push(parsedGpx)
                        }
                    )
                    setGpxRoute(gpxParsed)
                }
            })
        } catch (e) {
            console.log(e)
        }

    }

    const handleSubmission = (e) => {
        fileReader = new FileReader()
        fileReader.onloadend = handleReading;
        fileReader.readAsText(e.target.files[0])
    }

    const setPosition = (pos) => {
        setCurrentPosition(pos);
        props.handleSetPos(pos);
    }

    const parseFile = (content) => {
        let gpx = getGpxParse(content)
        setGpxPosition(gpx)
    }

    const setGpxPosition = (route) => {
        setMapPosition(() => (route.tracks[0].points.map(p => [p.lat, p.lon])));
    }

    const setGpxSelect = (name) => {
        let routeX = null;
        gpxRoute.forEach(route => {
            if (route.metadata.name === name)
                routeX = route;
        })
        setGpxPosition(routeX)
    }

    const cleanGpxOnMap = () => {
        setMapPosition(0)
    }

    return (
        <>
            {!isAdmin &&
            <div>
                <input type="file" onChange={handleSubmission}/>
                <br/>
                <button onClick={addRoute}>
                    <Text tid="addGPX"/>
                </button>
                <button onClick={cleanGpxOnMap}>
                    <Text tid="cleanGPX"/>
                </button>
                <br/>
                <select onChange={e => setGpxSelect(e.target.value)}>
                    {gpxRoute.map((route) => (
                        <option key={route.metadata.name}
                                value={route.metadata.name}>{route.metadata.time + "/" + route.metadata.name}</option>
                    ))}
                </select>
            </div>
            }
            <MapContainer
                center={[46.307205, 7.631260]}
                zoom={10}
                scrollWheelZoom={true}
                style={{width: '700px', height: '500px'}}
                className="mapping"
            >
                <TileLayer
                    url="https://wmts20.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"/>
                {(mapPosition.length && (
                    <Polyline
                        pathOptions={{fillColor: 'red', color: 'blue'}}
                        positions={mapPosition}
                    />
                ))}

                {props.poisCol.map((mapItem) => {
                    const pos = {lat: mapItem.coordinate_x, lng: mapItem.coordinate_y};
                    return (
                        <Marker key={mapItem.id} icon={DefaultIcon} position={pos}>
                            <Popup>
                                <Link to={`/POIDetails/${mapItem.id}`}>{mapItem.name}</Link>
                            </Popup>
                        </Marker>
                    )
                })}
                <Route path="/POIForm"
                       render={() => (
                           <>
                               <GetPos setPosition={setPosition}/>
                               <Marker icon={DefaultIcon} position={currentPosition}/>
                           </>
                       )}
                />

            </MapContainer>
        </>
    )
}

function GetPos(props) {
    useMapEvents({
        click: (e) => {
            props.setPosition(e.latlng)
        }
    });
    return null;
}

export default Map;