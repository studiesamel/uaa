import UserModel from '../model/User.model.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import ENV from '../config.js';
import nodemailer from 'nodemailer';



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


/** POST: http://localhost:8080/api/register 
 * @param : {
  "username" : "",
  "password" : "",
  "email": "",
  "trustedEmail":""
}
*/
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


/** POST: http://localhost:8080/api/login 
 * @param: {
  "username" : "example123",
  "password" : "admin123"
}
*/
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


/** GET: http://localhost:8080/api/user/example123 */
export async function getUser(req,res){
    
    const { username } = req.params;

    try {
        
        if(!username) return res.status(501).send({ error: "Invalid Username"});

        UserModel.findOne({ username }, function(err, user){
            if(err) return res.status(500).send({ err });
            if(!user) return res.status(501).send({ error : "Couldn't Find the User"});

            /** remove password from user */
            // mongoose return unnecessary data with object so convert it into json
            const { password, ...rest } = Object.assign({}, user.toJSON());

            return res.status(201).send(rest);
        })

    } catch (error) {
        return res.status(404).send({ error : "Cannot Find User Data"});
    }

}
// Fonction pour générer un code OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();



// Create nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: 'studiesamel@gmail.com',
        clientId: '630370459606-1eb0lt4iatlf8a9ag1ud0hf0co9r1kpv.apps.googleusercontent.com',
        clientSecret: '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',
        refreshToken: '1//04EXz4eAa0eGBCgYIARAAGAQSNwF-L9IrSC8FrArT870b72shp8JOxX8JdWOrRh9LsMine2B3n4VCRufLG_7Z60PjihKZuibpzJU',
        accessToken: 'ya29.a0AfB_byBlnjRzRaEabbbjNOKPlDwLGFT7B6fmMO068RZpSQGWNiFJPnh6cWN5fzQPSBYyWog0XIXHIP0qWHmcjKrc-GbkCYSIDfcuqN_EZEUQo4ImpGR8qvj3DBweynG0gTsGGVvv5NF6TKG0o5eMhx1yVJpDUKzh27mmaCgYKAZASARASFQHGX2MiExkbS1U54Z5cOQk7d1S5Tg0171',
    },
});

// Route pour demander la réinitialisation du mot de passe
export async function demanderResetMotDePasse(req, res) {
    const { email } = req.body;

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const trustedEmail = user.trustedEmail;

        // Générer un code OTP
        const otp = generateOTP();

        // Envoyer le code par e-mail
        await transporter.sendMail({
            from: 'mailwalker.noreply@gmail.com',
            to: trustedEmail,
            subject: 'Réinitialisation du mot de passe',
            text: `Votre code de réinitialisation du mot de passe est : ${otp}`,
        });

        // Mettre à jour le modèle utilisateur avec le code OTP et sa date d'expiration
        user.resetToken = otp;
        user.resetTokenExpiration = Date.now() + 5 * 60 * 1000; // Expiration dans 5 minutes
        await user.save();

        res.status(200).json({ message: 'Un e-mail avec le code de réinitialisation a été envoyé à votre adresse de confiance' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation de mot de passe' });
    }
};


// Route pour réinitialiser le mot de passe avec le code OTP
export async function resetMotDePasse(req,res){
  const { email, otp, nouveauMotDePasse } = req.body;

  try {
    const user = await UserModel.findOne({
      email,
      resetToken: otp,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Code de réinitialisation invalide ou expiré' });
    }


    // Utiliser bcrypt.genSalt pour générer le sel
    const salt = await bcrypt.genSalt(10);
    
    // Utiliser bcrypt.hash pour générer le hachage avec le sel
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, salt);


    await user.updateOne({password:hashedPassword})
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();

    res.status(200).json({ message: 'Le mot de passe a été réinitialisé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};



