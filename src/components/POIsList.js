import React from "react";
import Map from "./Map";
import {Link} from "react-router-dom";
import QRCode from "qrcode.react";
import {firebase} from "../initFirebase";
import {Text} from "../context/Language";

// Get the DB object from the firebase app
const db = firebase.firestore();
//Reference to a collection of POIs
const COLLECTION_POIS = "pois";

//fetch the pois and return the name in a list
function POIsList(props) {
    const [selectedPOI, setSelectedPOI] = React.useState(null);
    const [showQR, setShowQR] = React.useState(false)
    const toggleQR = () => setShowQR(!showQR)

    async function handleDelete(id) {
        const ref = db.collection(COLLECTION_POIS);
        let snapshot = await ref.get();

        for (let doc of snapshot.docs) {
            try {

                if (doc.id == id) {
                    await ref.doc(doc.id).delete();
                }

            } catch (e) {
                console.error(`Could not delete document with ID ${doc.id} `);
                console.error(e);
            }
        }
    }

    return (
        <div className="map_poi_container">
            <Map poisCol={props.poisCollection}/>
            <div>
                {props.isAdmin && (
                    <>
                        {props.buttonFormList}
                    </>
                )}
                <div id="poisList">
                    <button onClick={toggleQR}>{showQR ? <Text tid="hideQRCodes"/> : <Text tid="showQRCodes"/>}</button>
                    <h4><Text tid="poisCollection"/></h4>
                    <ul style={{listStyleType: "none"}}>
                        {props.pois.map((mapItem) => (
                            <li key={mapItem.id} style={{border: "1px solid white"}}>
                                <Link to={`/POIDetails/${mapItem.id}`} style={{color: "white", textDecoration: "none"}}>
                                    <div>
                                        <p>{mapItem.name}</p>
                                        {showQR ? <QRCode value={mapItem.URL}/> : ''}<br/>
                                    </div>
                                </Link>
                                {props.isAdmin && (
                                    <>
                                        <button onClick={() => handleDelete(mapItem.id)}><Text tid="deletePoi"/>
                                        </button>
                                        <Link to={`/POIEdit/${mapItem.id}`}>
                                            <button><Text tid="editPoi"/></button>
                                        </Link>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default POIsList;