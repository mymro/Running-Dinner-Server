module.exports = {
    de:{
        lang:"de",
        email_confirmed:"Email bestätigt",
        team:"Team",
        preferred_course:"Bevorzugter Gang",
        disliked_course:"nicht Bevorzugter Gang",
        saved:"Gespeichert",
        not_saved:"Die Änderungen wurden nicht gespeichert.",
        forms:{
            email:"Email",
            password:"Passwort",
            login:"Einloggen",
            first_name:"Vorname",
            last_name:"Nachname",
            phone_number:"Telefonnummer",
            register:"Registrieren",
            course_starter:"Vorspeise",
            course_main:"Hauptspeise",
            course_dessert:"Nachspeise",
            course_label_preferred:"Bitte wählt den Gang aus, den ihr am liebsten kochen würdet.",
            course_label_disliked:"Bitte wählt den Gang aus, den ihr a wenigsten gerne kochen würdet.",
            please_select:"Bitte auswählen",
            member_1:"Teammitglied 1",
            member_2:"Teammitglied 2",
            adress:"Adresse der Küche",
            city:"Stadt",
            zip:"PLZ",
            country:"Land",
            doorbell:"Haus Nr./Türe",
            street:"Straße",
            preferences:"Kochpräferenzen",
            notes:"Anmerkungen (z.B. Allergien, Unverträglichkeiten, ...)",
            send:"Absenden",
            forgot_password:"Passwort vergessen",
            save:"Speichern"
        },
        email:{
            create_account_subject:"Aktivierung deines Accounts und Passwort",
            resend_confirmation_subject:"Neuer Aktivierungslink",
            request_new_password_subject:"Neues Passwort"
        },
        menu:{
            login:"Einloggen",
            register:"Registrieren",
            home:"Hauptseite",
            logout:"Ausloggen",
            console:"Mein Account",
            admin:"Admin",
            settings:"Einstellungen"
        },
        buttons:{
            request_new_confirmation_label:'Neue Bestätigungsmail anfordern'
        },
        text:{
            something_went_wrong:"Es gab einen Fehler. Bitte probiere es später nocheinmal.",
            session_timed_out_redirect:"Deine Sitzung ist abgelaufen. Du wirst in wenigen Sekunden zum Login weitergeleitet.",
            registration_complete:{
                thanks:"Danke, dass ihr euch für das running dinner Event angemeldet habt. Ihr werdet in den nächsten Minuten eine Email bekommen mit einem Bestätigungslink und einem Passwort zum einloggen.",
                disclaimer:"Eure Teilnahme ist erst bestätigt, wenn mindestens einer von euch seine Email mit dem zugesandten Link bestätigt.",
                request_new_confirmation_text:'Sollte die email nicht ankommen, könnt ihr Mit dem unten stehenden Link eine neue Bestätigungsmail anfordern',
            },
            email_confirmed:{
                confirmed:"Deine Email wurde bestätigt. Du kannst dich ab sofort über die Hauptseite einloggen.",
                invalid_token:"Der Aktivierungslink ist leider nicht gültig. Du kannst dir unten einen neuen zuschicken lassen.",
                already_verified_or_does_not_exist:"Die Email wurde bereits aktiviert oder existiert nicht in der Datenbank."
            },
            new_confirmation_sent:"Ein neuer Bestätigungslink wurde an die angegebene Email gesendet.",
            request_new_confirmation:{
                normal:"Bitte gib eine Email an für die du einen neuen Bestätigungslink haben möchtest.",
                not_confirmed:"Deine Email Wurde leider noch nicht bestätigt. Bevor du dich einloggen kannst musst du deine Email bestätigen. Den dafür notwendigen Link kanns du unten anfragen."
            },
            login:{
                wrong_credentials:"Die Zugangsdaten waren falsch oder ein Nutzer mit dieser Email existiert nicht.",
                check_emails_for_password:"Ein neues Passwort wurde dir an die angegebene Emailadresse geschickt. Bitte überprüfe deinen Posteingang."
            },
            admin:{
                settings:{
                    reg_open:"Personen dürfen sich registrieren"
                },
                routing:"Routen erstellen",
                log:"Routingprogramm Logoutput:",
                start_routing:"Den Routingprozess starten",
                disclaimer:"Bevor du den Routingprozess startest solltest du dich vergewissern, dass sich keine neuen teams mehr anmelden und ihre Daten ändern können (siehe oben unter Einstellungen).",
                team_count:"Soviele Teams sind fertig registriert (mindestens eine Email bestätigt): "
            }
        }
    }
    
}