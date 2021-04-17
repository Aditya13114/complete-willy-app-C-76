import React from 'react';
import {Text, View, TouchableOpacity, StyleSheet, TextInput, Image, Alert, KeyboardAvoidingView, ToastAndroid} from 'react-native';
import * as Permissions from 'expo-permissions';
import {BarCodeScanner} from 'expo-barcode-scanner';
import  firebase from 'firebase';
import db from '../config';




export default class TransactionScreen extends React.Component{
    constructor (){
        super();
        this.state = {
            hasCameraPermissions :null,
            scanned:false,
           // scannedData:'',
            buttonState: 'normal',
            scannedBookId: '',
            scannedStudentId: '',
            transactionMessage: '',
        }
    }


    getCameraPermissions =async(id)=>{
        const  {status} = await Permissions.askAsync(Permissions.CAMERA);
        this.setState({
            hasCameraPermissions: status === "granted",
            buttonState: id,
            scanned:false,
        })

    }
    handleBarCodeScanned =async({type,data})=>{
        const {buttonState} = this.state
        if(buttonState === "StudentId"){
            this.setState({
                scanned:true,
                scannedStudentId: data,
                buttonState:'normal',
            })
        } else if(buttonState === "BookId"){
            this.setState({
                scanned:true,
                scannedBookId: data,
                buttonState:'normal',
            })
        }
       
    }

    


    initiateBookIssue =async()=>{
        db.collection("transactions").add({
            'studentId' : this.state.scannedStudentId,
            'bookId': this.state.scannedBookId,
            'date': firebase.firestore.Timestamp.now().toDate(),
            'transactionType':"Issue"
        })
        db.collection('books').doc(this.state.scannedBookId).update({
            'bookAvailability':false
        })
        db.collection('students').doc(this.state.scannedStudentId).update({
            'numberOfBooksIssued': firebase.firestore.FieldValue.increment(1)
        })
        this.setState({
            scannedBookId: '',
            scannedStudentId:''
        })
    }

    initiateBookReturn =async()=>{
        db.collection("transactions").add({
            'studentId' : this.state.scannedStudentId,
            'bookId': this.state.scannedBookId,
            'date': firebase.firestore.Timestamp.now().toDate(),
            'transactionType':"Return"
        })
        db.collection('books').doc(this.state.scannedBookId).update({
            'bookAvailability':true
        })
        db.collection('students').doc(this.state.scannedStudentId).update({
            'numberOfBooksIssued': firebase.firestore.FieldValue.increment(-1)
        })
        this.setState({
            scannedBookId: '',
            scannedStudentId:''
        })
    }

    


    checkBookEligibility=async()=>{
      const bookRef= await db.collection("books")
      .where("bookId", "==", this.state.scannedBookId).get();
      var transactionType= '';
      if(bookRef.docs.length===0){
        transactionType= false;
      }
      else{
          bookRef.docs.map(doc=>{
              var book= doc.data();
              if(book.bookAvailability){
                transactionType= "Issue";
              }
              else{
                  transactionType= "Return";
              }
          })
      }
      return transactionType;
    }


    checkStudentEligibilityForBookIssue=async()=>{
        const studentRef= await db 
        .collection("students")
        .where("studentId", "==", this.state.scannedStudentId)
        
        .get();
  
        var isStudentEligible = '';
        if(studentRef.docs.length === 0){
          this.setState({
              scannedBookId: '',
              scannedStudentId: '',
          })
          isStudentEligible= false;
          alert("The student id does not exist in database")
        }
        else{
         studentRef.docs.map(
             doc=>{
                 var student = doc.data();
                 if(student.numberOfBooksIssued<2){
                    isStudentEligible= true;
                 }
                 else{
                     isStudentEligible= false;
                     alert("The student has already issued two books");
                     this.setState({
                        scannedBookId: '',
                        scannedStudentId: '',
                     })
                 }
             }
         )
        }
        return isStudentEligible;
    }

    checkStudentEligibilityForReturn=async()=>{
      const transactionRef= await db 
      .collection("transactions")
      .where("bookId", "==", this.state.scannedBookId)
      .limit(1)
      .get();

      var isStudentEligible = '';
      transactionRef.docs.map(doc=>{
          var lastBookTransaction= doc.data();
          if(lastBookTransaction.studentId === this.state.scannedStudentId){
            isStudentEligible= true;
          }
          else{
              isStudentEligible= false;
              alert("The Book was not Issued By this Student");
              this.setState({
                  scannedStudentId:'',
                  scannedBookId: '',
              })
          }
      }

      )
      return isStudentEligible;
    }








    handleTransaction = async()=>{
      var transactionType = await this.checkBookEligibility();
      if(!transactionType){
        alert("book does not exists");
        this.setState({
            scannedBookId:'',
            scannedStudentId:'',
        })
      } else if( transactionType === "Issue"){
        var isStudentEligible = await this.checkStudentEligibilityForBookIssue();
        if(isStudentEligible){
            this.initiateBookIssue();
            alert("Book Issued To The Student")
        }
      } else {
        var isStudentEligible= await this.checkStudentEligibilityForReturn();
        if(isStudentEligible){
            this.initiateBookReturn();
            alert("Book is Returned By the Student")
        }
      }
      

    }
    
    render(){
        const hasCameraPermissions= this.state.hasCameraPermissions;
        const scanned= this.state.scanned;
        const buttonState= this.state.buttonState;

        if(buttonState !== 'normal' && hasCameraPermissions){
            return(
                <BarCodeScanner
                onBarCodeScanned= {scanned ?undefined:this.handleBarCodeScanned}
                style= {StyleSheet.absoluteFillObject}
                 />

                 
            )
        }
        else if(buttonState === 'normal'){
            return(
                <KeyboardAvoidingView style= {styles.container} behavior= "padding" enabled>
                <View style= {styles.container}>
                    <View>
                    <Image source= {require("../assets/booklogo.jpg")}
                    style= {{width:200, height:200}}/>
                    <Text style= {{textAlign:'center', fontSize:30,}}>WILLY APP</Text>

                    </View>
                    <View style= {styles.inputView}>
                        <TextInput
                        style= {styles.inputBox}
                        placeholder= "Book ID"
                        onChangeText= {text=>this.setState({
                            scannedBookId:text
                        })}
                        value= {this.state.scannedBookId} />
                        <TouchableOpacity style= {styles.scanButton}
                        onPress={()=>{this.getCameraPermissions("BookId")}}>
                            <Text style= {styles.buttonText}>Scan</Text>
                        </TouchableOpacity>

                        
                    </View>
                    <View style= {styles.inputView}>
                    <TextInput
                        style= {styles.inputBox}
                        placeholder= "Student ID"
                        onChangeText= {text=>this.setState({
                            scannedStudentId:text
                        })}
                        value= {this.state.scannedStudentId} />
                        <TouchableOpacity style= {styles.scanButton}
                        onPress={()=>{this.getCameraPermissions("StudentId")}}>
                            <Text style= {styles.buttonText}>Scan</Text>
                        </TouchableOpacity>

                    </View>
                    <TouchableOpacity style= {styles.submitButton}
                    onPress={async()=>{
                       var transactionMessage = await this.handleTransaction();
                      
                    }}>
                        <Text style= {styles.submitButtonText}>Submit</Text>
                    </TouchableOpacity>
                </View>
                </KeyboardAvoidingView>
            )

       
    }
}
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    displayText: {
      fontSize: 15,
      textDecorationLine: 'underline',
    },
    scanButton: {
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10,
    },
    buttonText: {
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10,
    },
    inputView: {
      flexDirection: 'row',
      margin: 20,
    },
    inputBox: {
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20,
    },
    scanButton: {
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0,
    },
    submitButton: {
      backgroundColor: '#FBC02D',
      width: 100,
      height: 50,
    },
    submitButtonText: {
      padding: 10,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white',
    },
  });
  