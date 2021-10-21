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
import gpxParser from "gpxparser";
import {Text} from "./context/Language";
import LanguageSelector from "./components/LanguageSelector";
import {BrowserRouter as Router, Switch, Route, Link, Redirect} from "react-router-dom";

// Get the DB object from the firebase app
const db = firebase.firestore();

//Reference to a collection of POIs
const COLLECTION_POIS = "pois";
const COLLECTION_USERS = "users";



function App() {
  // Get authenticated state using the custom "auth" hook
  const { isAuthenticated, isAdmin } = useAuth();
  const [isAddForm, setIsAddForm] = useState(false) ;
  //Store an entire collection of POIs in the state
  const [poisCollection, setPoisCollection] = useState([]);

  let handleIsAddForm = () => {
      setIsAddForm((isAddForm) => isAddForm = !isAddForm);
  }

    //formOrList display the list of POIs or
    // the form to add a new POI
    //buttonFormList is only for admin and allow
    //to change between the list and the form
    let formOrList ;
    let buttonFormList ;

    if (isAddForm){
        buttonFormList =  <Link to="/POIList"><button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>return to collection</button></Link>
    }
    else{
        buttonFormList =  <Link to="/POIForm"><button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}><Text tid="addPoi"/></button></Link>
    }

  useEffect( () => {
    //Fetch POIs of your DB
    const poisCollection = db.collection(COLLECTION_POIS);
    // Subscribe to DB changes
    const unsubscribe = poisCollection.onSnapshot(
      (snapshot) => {
        // Store the attributes of all POIs
          //and add an id attributes to the object
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
  /*const cleanDB = async () => {
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
  };*/

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
    <Router>
      <div className="App">
        <header>
            <h1 className='title'><Text tid="title"/></h1>
            {isAdmin ? "Admin" : "User"}
            <button onClick={signOut} className='logoutButton'>Logout</button>
            <div style={{padding : "50px"}}></div>
            <LanguageSelector/>
        </header>

                  <Route exact path="/">
                    <Redirect to="/POIList" />
                  </Route>
                  <Route path="/POIForm"
                         render={() => <POIsForm isAdmin={isAdmin} buttonFormList={buttonFormList} poisCollection={poisCollection}/>}
                  />
                  <Route path="/POIList"
                         render={() => <POIsList pois={poisCollection} isAdmin={isAdmin} buttonFormList={buttonFormList} poisCollection={poisCollection}/>}
                  />
                  <Route path="/POIDetails/:id"
                         render={routeParams => (<POIDetails selectedPOI={poisCollection.find((poi) => poi.id === routeParams.match.params.id)} isAdmin={isAdmin} buttonFormList={buttonFormList} poisCollection={poisCollection} />)}
                  />
      </div>
    </Router>
  );
}

//return a form that allow to add a new POI to the collection
//Admin only
class POIsForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPOI : this.emptyPOI
        }
    }

    emptyPOI = {name: '', description: '', URL: '', coordinate_x: '', coordinate_y: ''} ;

    //detect changes in the fields' form
    //set the newPOI state with the written values
    handleChange = (e) => {
        const target = e.target ;
        const name = target.name ;
        this.setState(prevState => ({
            newPOI: { ...prevState.newPOI, [name]: target.value }
        }));
        console.log(this.state.newPOI) ;
    }

    //add a new POI to the global collection (not user specific collection)
    handleSubmit = async (e) => {

        e.preventDefault() ;

        const poisCollectionTemp = db.collection(COLLECTION_POIS);

        try {
            await poisCollectionTemp.add({
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
            <div className="map_poi_container">
                <Map poisCol={this.props.poisCollection}/>
                <div>
                    {this.props.isAdmin  && (
                        <>
                            {this.props.buttonFormList}
                        </>
                    )}
                    <form onSubmit={this.handleSubmit}>
                        <br/>
                        <label>Name : <FormInputs type="text" onChange={this.handleChange} name="name"   placeholder="Name" value={this.state.newPOI.name}/></label><br/>
                        <label>Description : <FormInputs type="text" onChange={this.handleChange} name="description"   placeholder="Description" value={this.state.newPOI.description}/></label><br/>
                        <label>Coordinate X : <FormInputs type="text" onChange={this.handleChange} name="coordinate_x"  placeholder="Coordinate x" value={this.state.newPOI.coordinate_x}/></label><br/>
                        <label>Coordinate Y : <FormInputs type="text" onChange={this.handleChange} name="coordinate_y"  placeholder="Coordinate y" value={this.state.newPOI.coordinate_y}/></label><br/>
                        <label>URL : <FormInputs type="text" onChange={this.handleChange} name="URL"  placeholder="URL" value={this.state.newPOI.URL}/></label><br/>
                        <input type="submit"/></form>
                </div>
            </div>
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

//fetch the pois and return the name in a list
function POIsList(props){

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

    const [showQR, setShowQR] = React.useState(false)
    const toggleQR = () => setShowQR(!showQR)
    return(
        <div className="map_poi_container">
            <Map poisCol={props.poisCollection}/>
            <div>
                {props.isAdmin  && (
                    <>
                        {props.buttonFormList}
                    </>
                )}
                <div >
                    <button onClick={toggleQR}>{showQR ? 'hide QR Codes' : 'show QR Codes'}</button>
                    <h4>POIs Collection</h4>
                    <ul style={{listStyleType: "none"}}>
                        {props.pois.map((mapItem, index) => (
                            <li key={index} style={{border:  "1px solid white"}}>
                                <Link to={`/POIDetails/${mapItem.id}`} style={{color: "white", textDecoration: "none"}}>
                                   <div>
                                       <p>{mapItem.name}</p>
                                       {showQR ? <QRCode value={mapItem.URL}/> : ''}<br/>
                                   </div>
                                </Link>
                                <button onClick={() => handleDelete(mapItem.id)}>delete</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )

}

//Useless for now
class POI extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: this.props.id,
            name : this.props.name,
            description : this.props.description,
            coordinate_x : this.props.coordinate_x,
            coordinate_y : this.props.coordinate_y,
            URL : this.props.URL,
            visited: false
        }
    }

    //<POI {...mapItem}>
    render() {
        return(
            <span>{this.state.name}</span>

        )
    }

}

//display the route from a gpx file
function Map(props){

    let fileReader ;
    const [position, setPosition] = useState([])


    const handleReading = () => {
        const text = fileReader.result ;
        parseFile(text);
    }

    const handleSubmission = (e) => {
        fileReader = new FileReader()
        fileReader.onloadend = handleReading;
        fileReader.readAsText(e.target.files[0])
    }


    const parseFile = (content) => {
        let gpxParser = require('gpxparser');
        let gpx = new gpxParser();
        gpx.parse(content)
        setPosition(() => (gpx.tracks[0].points.map(p => [p.lat, p.lon])));
    }

    return (
        <>
        <input type="file" onChange={handleSubmission} />
            <MapContainer
                center={[46.307205, 7.631260]}
                zoom={9}
                scrollWheelZoom={false}
                style={{width: '700px', height: '500px'}}
                className="mapping"
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {(position.length &&(
                    <Polyline
                        pathOptions={{ fillColor: 'red', color: 'blue' }}
                        positions={position}
                    />
                ))}

                {props.poisCol.map((mapItem) => {
                    const pos = {lat: mapItem.coordinate_x, lng: mapItem.coordinate_y};
                    return(
                        <Marker position={pos}>
                            <Popup>
                                <Link to={`/POIDetails/${mapItem.id}`}>{mapItem.name}</Link>
                            </Popup>
                        </Marker>
                    )})}
            </MapContainer>
        </>
    )
}
//useless for now
function FileList(){

    const [files, setFiles] = useState([])


    return(
        <div >
            <h4>File Collection</h4>
            <ul>
                {files.map((mapItem, index) => (
                    <li key={index}>
                        {mapItem.name}
                    </li>
                ))}
            </ul>
        </div>
    )
}


function POIDetails(props) {

    const poisCol = [props.selectedPOI];

    return (
        <div className="map_poi_container">

            <Map poisCol={poisCol}/>
            <div>
                {props.isAdmin  && (
                    <>
                        {props.buttonFormList}
                    </>
                )}
                <div>
                      <h4>{props.selectedPOI.name}</h4>
                      <p>{props.selectedPOI.description}</p>
                      <a href={props.selectedPOI.URL}>
                          <QRCode value={props.selectedPOI.URL}/>
                      </a><br/>
                      <Link to="/POIList">
                          <button>back to List</button>
                      </Link>
                </div>
            </div>
        </div>
    );
}

export default App;
