import UserModel from '../model/User.model.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import ENV from '../config.js';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import otpGenerator from 'otp-generator';


const OAuth2_Client = new OAuth2Client({
    clientId: ENV.client_ID,
    clientSecret: ENV.Client_Secret,
  });
OAuth2_Client.setCredentials({ refresh_token: ENV.refresh_token });


// Récupération du jeton d'accès OAuth2
const accessToken = await OAuth2_Client.getAccessToken();

// Création d'un transporteur pour envoyer des e-mails via le service Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: 'yacinecherifi032@gmail.com',
        clientId: ENV.client_ID,
        clientSecret: ENV.Client_Secret,
        refreshToken: ENV.refresh_token,
        accessToken: accessToken
    }
});


// Envoi du mail contenant code otp pour réinitialisation
export async function réinitialisermdp(req, res) {
    const { email } = req.body;

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Ladresse email nappartient à aucun utilisateur' });
        }
        // Générer un code OTP
        const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });

        const trustedemail = user.trustedemail;
        // Définition des options de l'e-mail
        const mailOptions = {
            from: 'yacinecherifi032@gmail.com',
            to: trustedemail,
            subject: 'Subject',
            text: `Body of the email: ${otp}`
        };
        // Envoi de l'e-mail
        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail envoyé: ' + info.response);
        
        //update infos du user
        user.rtoken = otp;
        await user.save();

       //Results
     res.status(200).json({ message: 'Envoi du mail de réinitialisation réussi' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur denvoi du mail de réinitialisation' });
    } finally {
        transporter.close();
    }
};



//mise à jour du mdp
export async function majmdp(req,res){
  const { email, otp, mdp } = req.body;
  try {
    const user = await UserModel.findOne({
      email,
      rtoken: otp,
    });
    if (!user || user.rtoken !== otp) {
        return res.status(400).json({ message: 'Le code OTP saisi est incorrect' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mdp, salt);
    await user.updateOne({password:hashedPassword})
    user.rtoken = null;
    await user.save();
    res.status(200).json({ message: 'Le mdp a été mis à jour avec succés'});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur de mise à jour du mdp'});
  }
};





/** middleware for verify user */
export async function verifyUser(req, res, next){
    try {
        
        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existance
        let exist = await UserModel.findOne({ username });
        if(!exist) return res.status(404).send({ error : "Can't find User!"});
        next();

    } catch (error) {
        return res.status(404).send({ error: "Authentication Error"});
    }
}



export async function register(req,res){

    try {
        const { username, password, email, trustedEmail } = req.body;        

        // check the existing user
        const existUsername = new Promise((resolve, reject) => {
            UserModel.findOne({ username }, function(err, user){
                if(err) reject(new Error(err))
                if(user) reject({ error : "Please use unique username"});

                resolve();
            })
        });

        // check for existing email
        const existEmail = new Promise((resolve, reject) => {
            UserModel.findOne({ email }, function(err, email){
                if(err) reject(new Error(err))
                if(email) reject({ error : "Please use unique Email"});

                resolve();
            })
        });


        Promise.all([existUsername, existEmail])
            .then(() => {
                if(password){
                    bcrypt.hash(password, 10)
                        .then( hashedPassword => {
                            
                            const user = new UserModel({
                                username,
                                password: hashedPassword,
                                email,
                                trustedEmail
                            });

                            // return save result as a response
                            user.save()
                                .then(result => res.status(201).send({ msg: "User Register Successfully"}))
                                .catch(error => res.status(500).send({error}))

                        }).catch(error => {
                            return res.status(500).send({
                                error : "Enable to hashed password"
                            })
                        })
                }
            }).catch(error => {
                return res.status(500).send({ error })
            })


    } catch (error) {
        return res.status(500).send(error);
    }

}

export async function login(req,res){
   
    const { username, password } = req.body;

    try {
        
        UserModel.findOne({ username })
            .then(user => {
                bcrypt.compare(password, user.password)
                    .then(passwordCheck => {

                        if(!passwordCheck) return res.status(400).send({ error: "Don't have Password"});

                        // create jwt token
                        const token = jwt.sign({
                                        userId: user._id,
                                        username : user.username
                                    }, ENV.JWT_SECRET , { expiresIn : "24h"});

                        return res.status(200).send({
                            msg: "Login Successful...!",
                            username: user.username,
                            token
                        });                                    

                    })
                    .catch(error =>{
                        return res.status(400).send({ error: "Password does not Match"})
                    })
            })
            .catch( error => {
                return res.status(404).send({ error : "Username not Found"});
            })

    } catch (error) {
        return res.status(500).send({ error});
    }
};

