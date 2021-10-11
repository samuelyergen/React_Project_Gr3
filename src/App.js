import "./App.css";

import _ from "lodash";
import { firebase } from "./initFirebase";
import { useAuth } from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
  const [poisCollection, setPoisCollection] = useState(null);

  let handleIsAddForm = () => {
      setIsAddForm((isAddForm) => isAddForm = !isAddForm);
  }

    let formOrList ;
    if (isAddForm)
        formOrList = <POIsForm/>
    else
        formOrList = <POIsList pois={pois}/>

    let buttonFormList ;
    if (isAddForm)
        buttonFormList =  <button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>return to collection</button>
    else
        buttonFormList =  <button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>Add a new POI</button>


  useEffect(async () => {
    // EXAMPLE : Fetch POIs of your DB
    const poisCollection = db.collection(COLLECTION_POIS);
    pois = (await poisCollection.get()).docs;
    // Subscribe to DB changes
    const unsubscribe = poisCollection.onSnapshot(
      (snapshot) => {
        // Store the collection of POIs as an array of ID => Data pairs
        setPoisCollection(snapshot.docs.map((d) => ({ [d.id]: d.data() })));
      },
      (error) => console.error(error)
    );

    // Unsubscribe on unmount
    return () => unsubscribe();
  }, []);

  // EXAMPLE : Add a new document to the DB
  const addDummyData = async () => {
    // Add a random POI to your group's DB
    const poisCollection = await db.collection(COLLECTION_POIS);

    try {
      await poisCollection.add({
        name: `POI Test ${_.random(500)}`,
      });
    } catch (e) {
      console.error("Could not add new POI");
    }
  };

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
      <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true} style={{width: '500px', height: '500px'}}>
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


      {/* Render the collection of POIs from the DB */}
          <div>
              {!isAdmin  && (
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

    emptyPOI = {name: '', description: '', URL: ''} ;

    handleChange = (e) => {
        const target = e.target ;
        const name = target.name ;
        this.setState(prevState => ({
            newPOI: { ...prevState.newPOI, [name]: target.value }
        }));
    }

    handleSubmit = async (e) => {
        e.preventDefault() ;

        const poisCollection = await db.collection(COLLECTION_POIS);

        try {
            await poisCollection.add({
                name: this.state.newPOI.name,
                description: this.state.newPOI.description,
                URL: this.state.newPOI.URL,
            });
        } catch (e) {
            console.error("Could not add new POI");
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
                <br/>
                <input type={this.props.type} name={this.props.name} value={this.props.value} onChange={this.props.onChange} placeholder={this.props.placeholder} />
                <br/>
            </>
        );
    }
}

function POIsList({pois}){
    const [showQR, setShowQR] = React.useState(false)
    const toggleQR = () => setShowQR(!showQR)
    return(
        <ul>
            <h4>POIs Collection</h4>
            <button onClick={toggleQR}>{showQR ? 'hide QR Codes' : 'show QR Codes'}</button>
            {pois.map((mapItem, index) => (
                <li key={index}>
                    <code style={{ margin: "1em" }}>{JSON.stringify(mapItem.data())}</code><br/>
                    {showQR ? <QRCode value={JSON.stringify(mapItem.data())}/> : ''}<br/>
                </li>
            ))}
        </ul>
    )
}




export default App;
