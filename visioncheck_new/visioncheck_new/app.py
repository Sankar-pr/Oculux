import os, json, math, re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
import anthropic

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'visioncheck-secret-2026-change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///visioncheck.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# ─── MODELS ───────────────────────────────────────────────────────────────────

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    age  = db.Column(db.Integer)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    prescriptions = db.relationship('Prescription', backref='user', lazy=True)
    eye_tests     = db.relationship('EyeTestSession', backref='user', lazy=True)
    wishlist      = db.relationship('WishlistItem', backref='user', lazy=True)
    preferences   = db.relationship('UserPreference', backref='user', uselist=False, lazy=True)

class EyeTestSession(db.Model):
    __tablename__ = 'eye_test_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    snellen_re = db.Column(db.String(20))
    snellen_le = db.Column(db.String(20))
    colour_vision = db.Column(db.String(80))
    colour_score  = db.Column(db.Integer)
    astigmatism_axis = db.Column(db.Integer)
    astigmatism_flag = db.Column(db.Boolean, default=False)
    contrast_score = db.Column(db.Integer)
    near_vision    = db.Column(db.String(20))
    eye_health_score = db.Column(db.Integer)
    est_sph_re = db.Column(db.Float)
    est_sph_le = db.Column(db.Float)
    est_cyl    = db.Column(db.Float)
    est_add    = db.Column(db.Float)
    raw_results = db.Column(db.Text)

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    sph_re = db.Column(db.Float); cyl_re = db.Column(db.Float)
    axis_re = db.Column(db.Integer); add_re = db.Column(db.Float); pd_re = db.Column(db.Float)
    sph_le = db.Column(db.Float); cyl_le = db.Column(db.Float)
    axis_le = db.Column(db.Integer); add_le = db.Column(db.Float); pd_le = db.Column(db.Float)
    optometrist = db.Column(db.String(120))
    notes       = db.Column(db.Text)
    conditions  = db.Column(db.Text)
    rx_label    = db.Column(db.String(40))

class WishlistItem(db.Model):
    __tablename__ = 'wishlist'
    id = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    frame_name = db.Column(db.String(120))
    frame_type = db.Column(db.String(80))
    rim_type   = db.Column(db.String(80))
    added_at   = db.Column(db.DateTime, default=datetime.utcnow)

class UserPreference(db.Model):
    __tablename__ = 'user_preferences'
    id = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    usage_profile = db.Column(db.String(40), default='office')
    lens_pref     = db.Column(db.String(40))
    last_updated  = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(uid):
    return User.query.get(int(uid))

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def detect_conditions(sph_re, sph_le, cyl_re, cyl_le, add_re, colour_vision=None):
    conds = []
    sph = (sph_re or 0)
    if sph < -0.5 or (sph_le or 0) < -0.5:
        severity = 'mild' if abs(sph) < 3 else ('moderate' if abs(sph) < 6 else 'high')
        conds.append({'name':'Myopia','code':'myopia','severity':severity,
            'desc':'Difficulty seeing distant objects. Light focuses in front of the retina.',
            'icon':'🔍'})
    elif sph > 0.5 or (sph_le or 0) > 0.5:
        severity = 'mild' if abs(sph) < 3 else ('moderate' if abs(sph) < 6 else 'high')
        conds.append({'name':'Hypermetropia','code':'hypermetropia','severity':severity,
            'desc':'Difficulty seeing nearby objects. Light focuses behind the retina.',
            'icon':'👁'})
    if (cyl_re and abs(cyl_re) > 0) or (cyl_le and abs(cyl_le) > 0):
        cyl = max(abs(cyl_re or 0), abs(cyl_le or 0))
        severity = 'mild' if cyl < 1.5 else ('moderate' if cyl < 3 else 'high')
        conds.append({'name':'Astigmatism','code':'astigmatism','severity':severity,
            'desc':'Irregular corneal curvature causing blurred or distorted vision.',
            'icon':'⚡'})
    if (add_re and add_re > 0):
        severity = 'mild' if add_re < 1.5 else ('moderate' if add_re < 2.5 else 'high')
        conds.append({'name':'Presbyopia','code':'presbyopia','severity':severity,
            'desc':'Age-related loss of near focusing ability. Progressive lenses may be needed.',
            'icon':'📖'})
    if colour_vision and 'deficiency' in colour_vision.lower():
        conds.append({'name':'Colour Blindness','code':'colour','severity':'moderate',
            'desc':colour_vision,'icon':'🎨'})
    return conds

def compute_health_score(snellen_re, snellen_le, colour_score, contrast_score):
    score = 100
    def snellen_penalty(s):
        if not s: return 0
        if '6/6' in s: return 0
        if '6/9' in s: return 5
        if '6/12' in s: return 10
        if '6/18' in s: return 20
        if '6/24' in s: return 30
        if '6/36' in s: return 40
        if '6/60' in s: return 50
        return 25
    score -= snellen_penalty(snellen_re)
    score -= snellen_penalty(snellen_le)
    if colour_score is not None: score -= max(0, (10 - colour_score)) * 3
    if contrast_score is not None: score -= max(0, (5 - contrast_score)) * 4
    return max(0, min(100, score))

def call_claude(prompt, max_tokens=800):
    if not ANTHROPIC_API_KEY:
        return "Claude API key not configured. Set ANTHROPIC_API_KEY environment variable."
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=max_tokens,
        messages=[{'role':'user','content':prompt}]
    )
    return msg.content[0].text

# ─── AUTH ─────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        action = request.form.get('action')
        email = request.form.get('email','').strip().lower()
        password = request.form.get('password','')
        if action == 'register':
            name = request.form.get('name','').strip()
            age  = request.form.get('age', 0)
            if User.query.filter_by(email=email).first():
                flash('Email already registered.', 'danger')
            else:
                u = User(name=name, age=age, email=email,
                         password_hash=bcrypt.generate_password_hash(password).decode())
                db.session.add(u)
                db.session.commit()
                pref = UserPreference(user_id=u.id)
                db.session.add(pref)
                db.session.commit()
                login_user(u)
                return redirect(url_for('dashboard'))
        else:
            u = User.query.filter_by(email=email).first()
            if u and bcrypt.check_password_hash(u.password_hash, password):
                login_user(u)
                return redirect(url_for('dashboard'))
            flash('Invalid credentials.', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@app.route('/dashboard')
@login_required
def dashboard():
    latest_rx = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date.desc()).first()
    latest_test = EyeTestSession.query.filter_by(user_id=current_user.id).order_by(EyeTestSession.date.desc()).first()
    all_rx = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date).all()
    wishlist_count = WishlistItem.query.filter_by(user_id=current_user.id).count()
    conditions = []
    if latest_rx:
        conditions = detect_conditions(
            latest_rx.sph_re, latest_rx.sph_le,
            latest_rx.cyl_re, latest_rx.cyl_le,
            latest_rx.add_re,
            (latest_test.colour_vision if latest_test else None)
        )
    trend_labels = [r.date.strftime('%b %Y') for r in all_rx]
    trend_re = [r.sph_re for r in all_rx]
    trend_le = [r.sph_le for r in all_rx]
    return render_template('dashboard.html',
        latest_rx=latest_rx, latest_test=latest_test,
        conditions=conditions, wishlist_count=wishlist_count,
        trend_labels=json.dumps(trend_labels),
        trend_re=json.dumps(trend_re), trend_le=json.dumps(trend_le),
        all_rx=all_rx)

# ─── EYE TEST ─────────────────────────────────────────────────────────────────

@app.route('/eye_test')
@login_required
def eye_test():
    return render_template('eye_test.html')

@app.route('/api/save_eye_test', methods=['POST'])
@login_required
def save_eye_test():
    d = request.json
    snellen_re = d.get('snellen_re','6/6')
    snellen_le = d.get('snellen_le','6/6')
    colour_score = int(d.get('colour_score', 10))
    contrast_score = int(d.get('contrast_score', 5))
    astig_axis = d.get('astigmatism_axis')
    astig_flag = d.get('astigmatism_flag', False)
    near_vision = d.get('near_vision','J1')
    colour_result = d.get('colour_vision_result','Normal')
    health_score = compute_health_score(snellen_re, snellen_le, colour_score, contrast_score)
    # Estimate refractive values from acuity
    snellen_map = {'6/6':0,'6/9':-0.5,'6/12':-1.0,'6/18':-1.5,'6/24':-2.25,'6/36':-3.0,'6/60':-4.0}
    est_sph_re = snellen_map.get(snellen_re, 0)
    est_sph_le = snellen_map.get(snellen_le, 0)
    est_add = 0
    if near_vision and near_vision >= 'J5':
        est_add = 1.5
    elif near_vision and near_vision >= 'J3':
        est_add = 1.0
    session_obj = EyeTestSession(
        user_id=current_user.id,
        snellen_re=snellen_re, snellen_le=snellen_le,
        colour_vision=colour_result, colour_score=colour_score,
        astigmatism_axis=astig_axis, astigmatism_flag=astig_flag,
        contrast_score=contrast_score, near_vision=near_vision,
        eye_health_score=health_score,
        est_sph_re=est_sph_re, est_sph_le=est_sph_le,
        est_cyl=(abs(d.get('astigmatism_cyl',0)) if astig_flag else 0),
        est_add=est_add,
        raw_results=json.dumps(d)
    )
    db.session.add(session_obj)
    db.session.commit()
    return jsonify({'success':True, 'health_score':health_score, 'session_id':session_obj.id})

# ─── PRESCRIPTION ─────────────────────────────────────────────────────────────

@app.route('/prescription')
@login_required
def prescription():
    rxs = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date.desc()).all()
    return render_template('prescription.html', prescriptions=rxs)

@app.route('/api/save_prescription', methods=['POST'])
@login_required
def save_prescription():
    d = request.json
    def flt(v): return float(v) if v not in (None,'','None') else None
    def nt(v): return int(v) if v not in (None,'','None') else None
    sph_re=flt(d.get('sph_re')); sph_le=flt(d.get('sph_le'))
    cyl_re=flt(d.get('cyl_re')); cyl_le=flt(d.get('cyl_le'))
    add_re=flt(d.get('add_re'))
    conds = detect_conditions(sph_re, sph_le, cyl_re, cyl_le, add_re)
    max_sph = max(abs(sph_re or 0), abs(sph_le or 0))
    rx_label = 'mild' if max_sph < 3 else ('moderate' if max_sph < 6 else 'high')
    rx = Prescription(
        user_id=current_user.id,
        date=datetime.strptime(d.get('date', datetime.utcnow().strftime('%Y-%m-%d')), '%Y-%m-%d'),
        sph_re=sph_re, cyl_re=cyl_re, axis_re=nt(d.get('axis_re')), add_re=add_re, pd_re=flt(d.get('pd_re')),
        sph_le=sph_le, cyl_le=cyl_le, axis_le=nt(d.get('axis_le')), add_le=flt(d.get('add_le')), pd_le=flt(d.get('pd_le')),
        optometrist=d.get('optometrist',''), notes=d.get('notes',''),
        conditions=json.dumps(conds), rx_label=rx_label
    )
    db.session.add(rx)
    db.session.commit()
    return jsonify({'success':True,'id':rx.id,'conditions':conds,'rx_label':rx_label})

@app.route('/api/delete_prescription/<int:rx_id>', methods=['DELETE'])
@login_required
def delete_prescription(rx_id):
    rx = Prescription.query.filter_by(id=rx_id, user_id=current_user.id).first_or_404()
    db.session.delete(rx)
    db.session.commit()
    return jsonify({'success':True})

# ─── FRAME FINDER ─────────────────────────────────────────────────────────────

@app.route('/frame_finder')
@login_required
def frame_finder():
    latest_rx = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date.desc()).first()
    wishlist_ids = [w.frame_name for w in WishlistItem.query.filter_by(user_id=current_user.id).all()]
    return render_template('frame_finder.html', latest_rx=latest_rx, wishlist_ids=json.dumps(wishlist_ids))

@app.route('/api/frame_recommendation', methods=['POST'])
@login_required
def frame_recommendation():
    d = request.json
    face_shape = d.get('face_shape','oval')
    sph_re = d.get('sph_re'); sph_le = d.get('sph_le')
    cyl    = d.get('cyl')
    prompt = f"""You are an expert optical consultant. A patient has:
- Face shape: {face_shape}
- Right eye prescription: SPH {sph_re}, CYL {cyl}
- Left eye prescription: SPH {sph_le}, CYL {cyl}

Recommend the BEST eyeglass frame for them. Respond in EXACTLY this JSON format with no other text:
{{
  "best_shape": "one of: round|square|oval|cat-eye|aviator|wayfarer|geometric|browline",
  "best_rim": "one of: full-rim|half-rim|rimless",
  "reason": "2-3 sentence explanation",
  "scores": {{
    "round": 85, "square": 70, "oval": 90, "cat-eye": 60,
    "aviator": 75, "wayfarer": 80, "geometric": 65, "browline": 55
  }},
  "lens_recommendation": "brief lens type suggestion based on prescription",
  "style_tip": "one practical styling tip"
}}"""
    try:
        result = call_claude(prompt, max_tokens=600)
        # extract JSON
        m = re.search(r'\{.*\}', result, re.DOTALL)
        if m:
            data = json.loads(m.group())
            return jsonify({'success':True,'data':data})
    except Exception as e:
        pass
    # Fallback
    fallback = {
        'best_shape':'oval','best_rim':'full-rim',
        'reason':f'For a {face_shape} face, oval frames create visual balance.',
        'scores':{'round':75,'square':80,'oval':90,'cat-eye':65,'aviator':70,'wayfarer':85,'geometric':60,'browline':55},
        'lens_recommendation':'Single vision lenses recommended.',
        'style_tip':'Choose a frame width matching your face width for best proportions.'
    }
    return jsonify({'success':True,'data':fallback})

@app.route('/api/ai_insight', methods=['POST'])
@login_required
def ai_insight():
    d = request.json
    topic = d.get('topic','eye health')
    context = d.get('context','')
    prompt = f"""As a caring optometrist, explain this eye health topic in 3–4 plain sentences that a patient would understand:
Topic: {topic}
Patient context: {context}
Keep it warm, non-alarming, and end with one practical tip."""
    try:
        result = call_claude(prompt, max_tokens=300)
        return jsonify({'success':True,'text':result})
    except Exception as e:
        return jsonify({'success':False,'text':f'Unable to fetch AI insight: {e}'})

# ─── FRAMES SHOP ──────────────────────────────────────────────────────────────

@app.route('/frames')
@login_required
def frames():
    wishlist_ids = [w.frame_name for w in WishlistItem.query.filter_by(user_id=current_user.id).all()]
    latest_rx = current_user.prescriptions[-1] if current_user.prescriptions else None
    return render_template('frames.html', wishlist_ids=json.dumps(wishlist_ids), latest_rx=latest_rx)

# ─── WISHLIST ─────────────────────────────────────────────────────────────────

@app.route('/wishlist')
@login_required
def wishlist():
    items = WishlistItem.query.filter_by(user_id=current_user.id).order_by(WishlistItem.added_at.desc()).all()
    return render_template('wishlist.html', items=items)

@app.route('/api/wishlist/toggle', methods=['POST'])
@login_required
def wishlist_toggle():
    d = request.json
    name = d.get('frame_name')
    existing = WishlistItem.query.filter_by(user_id=current_user.id, frame_name=name).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'success':True,'action':'removed'})
    item = WishlistItem(user_id=current_user.id, frame_name=name,
                        frame_type=d.get('frame_type',''), rim_type=d.get('rim_type',''))
    db.session.add(item)
    db.session.commit()
    return jsonify({'success':True,'action':'added'})

@app.route('/api/wishlist/remove/<int:item_id>', methods=['DELETE'])
@login_required
def wishlist_remove(item_id):
    item = WishlistItem.query.filter_by(id=item_id, user_id=current_user.id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'success':True})

# ─── INSIGHTS ─────────────────────────────────────────────────────────────────

@app.route('/insights')
@login_required
def insights():
    latest_rx = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date.desc()).first()
    latest_test = EyeTestSession.query.filter_by(user_id=current_user.id).order_by(EyeTestSession.date.desc()).first()
    all_rx = Prescription.query.filter_by(user_id=current_user.id).order_by(Prescription.date).all()
    prev_rx = None
    if len(all_rx) >= 2:
        prev_rx = all_rx[-2]
    power_changed = False
    if latest_rx and prev_rx:
        if abs((latest_rx.sph_re or 0) - (prev_rx.sph_re or 0)) > 0.5:
            power_changed = True
    pref = current_user.preferences
    return render_template('insights.html',
        latest_rx=latest_rx, latest_test=latest_test,
        power_changed=power_changed, pref=pref,
        all_rx=all_rx)

@app.route('/api/save_preference', methods=['POST'])
@login_required
def save_preference():
    d = request.json
    pref = current_user.preferences
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.session.add(pref)
    pref.usage_profile = d.get('usage_profile', 'office')
    pref.lens_pref = d.get('lens_pref','')
    pref.last_updated = datetime.utcnow()
    db.session.commit()
    return jsonify({'success':True})

# ─── INIT & MAIN ──────────────────────────────────────────────────────────────

# ─── Template filters & context ───────────────────────────────────────────────

@app.template_filter('from_json')
def from_json_filter(value):
    try:
        return json.loads(value) if value else []
    except Exception:
        return []

@app.context_processor
def inject_now():
    return {'now': datetime.utcnow()}

# ─── INIT & MAIN ──────────────────────────────────────────────────────────────

with app.app_context():
    db.create_all()
    # Create a demo user if no users exist
    if not User.query.first():
        demo = User(
            name='Demo User', age=30, email='test@test.com',
            password_hash=bcrypt.generate_password_hash('test123').decode()
        )
        db.session.add(demo)
        db.session.commit()
        db.session.add(UserPreference(user_id=demo.id, usage_profile='office'))
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
