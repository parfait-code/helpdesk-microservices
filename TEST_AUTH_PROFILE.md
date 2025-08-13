# Test d'authentification et de profil utilisateur

## Étapes pour tester la correction :

### 1. Inscription d'un utilisateur

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### 2. Connexion (récupérer le token)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Récupérer le profil utilisateur (utiliser le token de l'étape 2)

```bash
curl -X GET http://localhost:3002/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Vérifier que le profil a été créé automatiquement

Si tout fonctionne correctement, l'étape 3 devrait retourner les informations du profil utilisateur au lieu d'une erreur 401.

### Points de vérification :

1. **Service d'authentification** : Doit démarrer sans erreur
2. **Service utilisateur** : Doit démarrer sans erreur
3. **Inscription** : Doit créer l'utilisateur ET notifier le service utilisateur
4. **Connexion** : Doit fonctionner normalement
5. **Récupération du profil** : Doit fonctionner sans erreur 401

### Logs à vérifier :

```bash
# Logs du service d'authentification
docker logs helpdesk-auth-service -f

# Logs du service utilisateur
docker logs helpdesk-user-service -f
```

### Corrections apportées :

1. **UserServiceClient.js** : Créé le fichier manquant pour la communication entre services
2. **Routes internes** : Ajouté `/internal/user-registered` dans le service utilisateur
3. **Références circulaires** : Corrigées entre ProfileService et KafkaService
4. **Endpoint verify** : Ajouté pour la vérification des tokens
5. **Notification automatique** : Le service d'authentification notifie maintenant le service utilisateur lors de l'inscription
