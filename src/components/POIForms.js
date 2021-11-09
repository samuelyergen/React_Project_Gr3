import React from "react";
import Map from "./Map";
import {Link} from "react-router-dom";
import {firebase} from "../initFirebase";

// Get the DB object from the firebase app
const db = firebase.firestore();

//Reference to a collection of POIs
const COLLECTION_POIS = "pois";

//return a form that allow to add a new POI to the collection
//Admin only
class AddPOI extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPOI: this.emptyPOI,
            currentPosX: null,
            currentPosY: null
        }
    }

    emptyPOI = {name: '', description: '', URL: '', coordinate_x: '', coordinate_y: ''};

    //detect changes in the fields' form
    //set the newPOI state with the written values
    handleChange = (e) => {
        const target = e.target;
        const name = target.name;
        this.setState(prevState => ({
            newPOI: {...prevState.newPOI, [name]: target.value}
        }));
        console.log(this.state.newPOI);
    }

    //add a new POI to the global collection (not user specific collection)
    handleSubmit = async (e) => {

        e.preventDefault();

        const poisCollectionTemp = db.collection(COLLECTION_POIS);

        try {
            await poisCollectionTemp.add({
                name: this.state.newPOI.name,
                description: this.state.newPOI.description,
                URL: this.state.newPOI.URL,
                coordinate_x: this.state.currentPosX,
                coordinate_y: this.state.currentPosY
            });
        } catch (e) {
            console.error("Could not add new POI" + e.message);
        }
        this.resetNewPOI();
    }

    resetNewPOI = () => {
        this.setState({newPOI: this.emptyPOI});
    }

    handleSetPos = (pos) => {
        this.setState({currentPosX: pos.lat});
        this.setState({currentPosY: pos.lng});
    }

    render() {
        return (
            <div className="map_poi_container">
                <Map poisCol={this.props.poisCollection} handleSetPos={this.handleSetPos}/>
                <div>
                    {this.props.isAdmin && (
                        <>
                            {this.props.buttonFormList}
                        </>
                    )}
                    <FormPOI handleChange={this.handleChange} handleSubmit={this.handleSubmit}
                             name={this.state.newPOI.name} description={this.state.newPOI.description}
                             coordinate_x={this.state.currentPosX} coordinate_y={this.state.currentPosY}
                             URL={this.state.newPOI.URL}/>
                </div>
            </div>
        );
    }

}

class FormInputs extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <>
                <input type={this.props.type} name={this.props.name} value={this.props.value}
                       onChange={this.props.onChange} placeholder={this.props.placeholder} required={true}/>
            </>
        );
    }
}

//Allow to edit a POI in the global collection
//Only for admins
class POIEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editablePOI: this.poi
        }
    }

    poi = {
        name: this.props.selectedPOI.name,
        description: this.props.selectedPOI.description,
        URL: this.props.selectedPOI.URL,
        coordinate_x: this.props.selectedPOI.coordinate_x,
        coordinate_y: this.props.selectedPOI.coordinate_y,
        id: this.props.selectedPOI.id
    }

    poisCol = [this.props.selectedPOI];

    handleChange = (e) => {
        const target = e.target;
        const name = target.name;
        this.setState(prevState => ({
            editablePOI: {...prevState.editablePOI, [name]: target.value}
        }));
        console.log(this.state.editablePOI);
    }

    handleSubmit = async (e) => {

        e.preventDefault();

        const poiRef = db.collection(COLLECTION_POIS).doc(this.state.editablePOI.id)

        try {
            await poiRef.set(
                {
                    'name': this.state.editablePOI.name,
                    'description': this.state.editablePOI.description,
                    'URL': this.state.editablePOI.URL,
                    'coordinate_x': this.state.editablePOI.coordinate_x,
                    'coordinate_y': this.state.editablePOI.coordinate_y
                })
        } catch {
            console.error("Could not update POI" + e.message);
        }
    }

    render() {
        return (
            <div className="map_poi_container">
                <Map poisCol={this.poisCol}/>
                <div>
                    <Link to="/POIList">
                        <button style={{width: '120px', height: '50px'}}>back to List</button>
                    </Link>
                    <FormPOI handleChange={this.handleChange} handleSubmit={this.handleSubmit}
                             name={this.state.editablePOI.name} description={this.state.editablePOI.description}
                             coordinate_x={this.state.editablePOI.coordinate_x}
                             coordinate_y={this.state.editablePOI.coordinate_y} URL={this.state.editablePOI.URL}/>
                </div>

            </div>
        );
    }
}

//Form used to add or edit a POI
function FormPOI(props) {
    return (
        <form onSubmit={props.handleSubmit}>
            <br/>
            <label>Name : <FormInputs type="text" onChange={props.handleChange} name="name" placeholder="Name"
                                      value={props.name}/></label><br/>
            <label>Description : <FormInputs type="text" onChange={props.handleChange} name="description"
                                             placeholder="Description" value={props.description}/></label><br/>
            <label>Coordinate X : <FormInputs type="text" onChange={props.handleChange} name="coordinate_x"
                                              placeholder="Coordinate x" value={props.coordinate_x}/></label><br/>
            <label>Coordinate Y : <FormInputs type="text" onChange={props.handleChange} name="coordinate_y"
                                              placeholder="Coordinate y" value={props.coordinate_y}/></label><br/>
            <label>URL : <FormInputs type="text" onChange={props.handleChange} name="URL" placeholder="URL"
                                     value={props.URL}/></label><br/>
            <input type="submit" value="Submit"/>
        </form>
    )
}

export {AddPOI, POIEdit}
