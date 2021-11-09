import React, {useState} from "react";
import {MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents} from "react-leaflet";
import {Link, Route} from "react-router-dom";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import L, {bind} from "leaflet";
import {useAuth} from "../context/AuthContext";
import {firebase} from "../initFirebase";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});

// Get the DB object from the firebase app
const db = firebase.firestore();

//display the route from a gpx file
function Map(props) {

    let fileReader;
    const [mapPosition, setMapPosition] = useState([])

    const [currentPosition, setCurrentPosition] = useState([0, 0])

    const handleReading = () => {
        const text = fileReader.result;
        parseFile(text);
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
        let gpxParser = require('gpxparser');
        let gpx = new gpxParser();
        gpx.parse(content)
        setMapPosition(() => (gpx.tracks[0].points.map(p => [p.lat, p.lon])));
    }

    return (
        <>
            <input type="file" onChange={handleSubmission}/>
            <MapContainer
                center={[46.307205, 7.631260]}
                zoom={9}
                scrollWheelZoom={false}
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

function FileList(props) {

    const [files, setFiles] = useState([])
    const {isAuthenticated, isAdmin} = useAuth();

    let files2;

    const myGpxCollection = db.collection("gpxFiles");

    myGpxCollection.onSnapshot(snapshot => {
        setFiles(snapshot.docs.map(p => {return p.data()}))
    })
    return (
        <div>
            <h4>File Collection</h4>
            <ul>
                {files.map((file) => (
                    <li >
                        {file.filename}
                        <button onClick={() => props.handleSubmission(file.filename)}>show Route</button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Map;