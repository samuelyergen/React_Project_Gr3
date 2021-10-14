import "./App.css";

import _ from "lodash";
import { firebase } from "./initFirebase";
import { useAuth } from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import { useEffect, useState } from "react";
import {MapContainer, TileLayer, Marker, Popup, Polyline} from 'react-leaflet';
import "leaflet/dist/leaflet.css" ;
import React from "react";
import QRCode from 'qrcode.react';

// Get the DB object from the firebase app
const db = firebase.firestore();

// EXAMPLE : Reference to a collection of POIs
const COLLECTION_POIS = "pois";

let pois = [];


function App() {
  // Get authenticated state using the custom "auth" hook
  const { isAuthenticated, isAdmin } = useAuth();
  const [isAddForm, setIsAddForm] = useState(false) ;
  // EXAMPLE : Store an entire collection of POIs in the state
  const [poisCollection, setPoisCollection] = useState([]);

  let handleIsAddForm = () => {
      setIsAddForm((isAddForm) => isAddForm = !isAddForm);
  }

    let formOrList ;
    let buttonFormList ;

    if (isAddForm){
        formOrList = <POIsForm/>
        buttonFormList =  <button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>return to collection</button>
    }
    else{
        formOrList = <POIsList pois={poisCollection}/>
        buttonFormList =  <button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>Add a new POI</button>
    }

  useEffect( () => {
    // EXAMPLE : Fetch POIs of your DB
    const poisCollection = db.collection(COLLECTION_POIS);

    // Subscribe to DB changes
    const unsubscribe = poisCollection.onSnapshot(
      (snapshot) => {
        // Store the name of all POIs
        setPoisCollection(snapshot.docs.map((d) => {
            let data = d.data();
            data['id'] = d.id
            return data
        }));
      },
      (error) => console.error(error)
    );

    // Unsubscribe on unmount
    return () => unsubscribe();
  }, []);


  // WARNING: Only for debugging purposes, this should not be used in a production environment!
  const cleanDB = async () => {
    const ref = db.collection(COLLECTION_POIS);

    let snapshot = await ref.get();

    for (let doc of snapshot.docs) {
      try {
        await ref.doc(doc.id).delete();
      } catch (e) {
        console.error(`Could not delete document with ID ${doc.id} `);
        console.error(e);
      }
    }
  };

  // Log out of the application
  const signOut = async () => {
    try {
      await firebase.auth().signOut();
    } catch (e) {
      console.error(e);
    }
  };

  // If the user is not authenticated, render the "SignIn" component (Firebase UI)
  if (!isAuthenticated) return <SignIn />;


  // Normal rendering of the app for authenticated users
  return (
    <div className="App">
        <header>
            <h1 className='title'>Welcome to the Pfyn-Finges Forest!</h1>
            your role is {isAdmin ? "Admin" : "User"}
            <button onClick={signOut} className='logoutButton'>Logout</button>
         <div style={{padding : "50px"}}></div>
        </header>

      <div className="map_poi_container">
      <MapContainer center={[46.307205, 7.631260]} zoom={13} scrollWheelZoom={true} style={{width: '500px', height: '500px'}}>
        <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[51.505, -0.09]}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer>
        <div style={{padding : "50px"}}></div>
      {/* Show role based on admin status (from custom claim) */}


      {/* Render the collection of POIs from the DB or the form to add a POI*/}
          <div>
              {isAdmin  && (
                  <>
                  {buttonFormList}
                  </>
              )}
              {formOrList}
          </div>
      </div>
    </div>
  );
}

class POIsForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPOI : this.emptyPOI
        }
    }

    emptyPOI = {name: '', description: '', URL: '', coordinate_x: '', coordinate_y: ''} ;

    handleChange = (e) => {
        const target = e.target ;
        const name = target.name ;
        this.setState(prevState => ({
            newPOI: { ...prevState.newPOI, [name]: target.value }
        }));
        console.log(this.state.newPOI) ;
    }

    handleSubmit = async (e) => {

        e.preventDefault() ;

        const poisCollection = await db.collection(COLLECTION_POIS);

        try {
            await poisCollection.add({
                name: this.state.newPOI.name,
                description: this.state.newPOI.description,
                URL: this.state.newPOI.URL,
                coordinate_x : this.state.newPOI.coordinate_x,
                coordinate_y : this.state.newPOI.coordinate_y,
            });
        } catch (e) {
            console.error("Could not add new POI" + e.message);
        }
        this.resetNewPOI() ;
    }

    resetNewPOI = () => {
        this.setState({newPOI : this.emptyPOI}) ;
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <br/>
                <label>Name : <FormInputs type="text" onChange={this.handleChange} name="name"   placeholder="Name" value={this.state.newPOI.name}/></label><br/>
                <label>Description : <FormInputs type="text" onChange={this.handleChange} name="description"   placeholder="Description" value={this.state.newPOI.description}/></label><br/>
                <label>Coordinate X : <FormInputs type="text" onChange={this.handleChange} name="coordinate_x"  placeholder="Coordinate x" value={this.state.newPOI.coordinate_x}/></label><br/>
                <label>Coordinate Y : <FormInputs type="text" onChange={this.handleChange} name="coordinate_y"  placeholder="Coordinate y" value={this.state.newPOI.coordinate_y}/></label><br/>
                <label>URL : <FormInputs type="text" onChange={this.handleChange} name="URL"  placeholder="URL" value={this.state.newPOI.URL}/></label><br/>
                <input type="submit"/></form>
        );
    }

}

class FormInputs extends React.Component{
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <>
                <input type={this.props.type} name={this.props.name} value={this.props.value} onChange={this.props.onChange} placeholder={this.props.placeholder} />
            </>
        );
    }
}


function POIsList({pois}){

   const [selectedPOI, setSelectedPOI] = React.useState(null);

   async function handleDelete(id) {

       const ref = db.collection(COLLECTION_POIS);

       let snapshot = await ref.get();

       for (let doc of snapshot.docs) {
           try {

               if (doc.id == id){
                   await ref.doc(doc.id).delete();
               }

           } catch (e) {
               console.error(`Could not delete document with ID ${doc.id} `);
               console.error(e);
           }
       }
    }

    const markPOI = (e, mapItem) => {
       // todo mark POI on Map
    }

    const [showQR, setShowQR] = React.useState(false)
    const toggleQR = () => setShowQR(!showQR)
    return(
        <div >
            <button onClick={toggleQR}>{showQR ? 'hide QR Codes' : 'show QR Codes'}</button>
            <h4>POIs Collection</h4>
            <ul style={{listStyleType: "none"}}>
                {pois.map((mapItem, index) => (
                    <li key={index} style={{border:  "1px solid white"}} onClick={(e, {mapItem}) => markPOI(e, mapItem)}>
                        <a onClick={markPOI}>{mapItem.name + "   "}</a>
                        {showQR ? <QRCode value={mapItem.URL}/> : ''}<br/>
                        <button onClick={() => handleDelete(mapItem.id)}>delete</button></li>
                ))}
            </ul>
            </div>
           
    )

}



function gpxMap(){
    let gpxParser = require('gpxparser');
    let gpx = new gpxParser();
    let gpxData = gpx.parse("ressources/test1.gpx") ;
    const positions = gpxData.tracks[0].points.map(p => [p.lat, p.lon]);
    return (
        <MapContainer
            // for simplicty set center to first gpx point
            center={positions[0]}
            zoom={9}
            scrollWheelZoom={false}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline
                pathOptions={{ fillColor: 'red', color: 'blue' }}
                positions={positions}
            />
        </MapContainer>
    )
}


export default App;
